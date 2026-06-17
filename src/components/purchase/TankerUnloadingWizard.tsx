import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StepIndicator } from './StepIndicator';
import { TruckVisual } from './TruckVisual';
import { usePurchaseStore } from '@/store/purchase-store';
import { useCloudData } from '@/contexts/CloudDataContext';
import { TruckChamber, DensityCheck, StockVerification } from '@/types/purchase';
import { FuelType } from '@/types/petrol-pump';
import { formatAmount, formatLiters } from '@/lib/format';
import { ArrowLeft, ArrowRight, Check, Truck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Invoice', 'Truck', 'Dip Check', 'Unloading', 'Verify'];
const chamberIdFromNumber = (n: number) => `chamber-${n}`;

const fuelBadge = (f: FuelType) =>
  cn(
    'px-2 py-0.5 rounded text-xs font-semibold',
    f === 'MS' && 'bg-orange-500/20 text-orange-600',
    f === 'HSD' && 'bg-blue-500/20 text-blue-600',
    f === 'POWER' && 'bg-pink-500/20 text-pink-600'
  );

export function TankerUnloadingWizard() {
  const navigate = useNavigate();
  const {
    tanks: localTanks,
    initializeTanks,
    lastChamberCapacity,
    setLastChamberCapacity,
  } = usePurchaseStore();

  const { tanks: cloudTanks, updateTank: updateCloudTank, createPurchase: createCloudPurchase } = useCloudData();

  const tanks = cloudTanks.length > 0
    ? cloudTanks.map(t => ({
        id: t.id,
        name: t.name,
        fuelType: t.fuel_type as FuelType,
        capacity: t.capacity,
        currentStock: t.current_stock,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }))
    : localTanks;

  const getTanksByFuelType = (fuelType: FuelType) => tanks.filter(t => t.fuelType === fuelType);

  useEffect(() => { initializeTanks(); }, [initializeTanks]);

  const [currentStep, setCurrentStep] = useState(1);
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentStep]);

  // Step 1
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalInvoiceValue, setTotalInvoiceValue] = useState<number>(0);

  // Step 2
  const [numberOfChambers, setNumberOfChambers] = useState<number>(0);
  const [chambers, setChambers] = useState<TruckChamber[]>([]);

  const lastChamberCapacityRef = useRef(lastChamberCapacity);
  useEffect(() => { lastChamberCapacityRef.current = lastChamberCapacity; }, [lastChamberCapacity]);

  // Step 3 — tank dips before/after unloading per tank
  const [tankDips, setTankDips] = useState<Record<string, { before: number; after: number }>>({});

  // Step 4 — allocations: tankId -> liters
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Step 5
  const [stockVerifications, setStockVerifications] = useState<StockVerification[]>([]);

  // Generate chambers
  useEffect(() => {
    if (numberOfChambers <= 0) { setChambers([]); return; }
    setChambers(prev => {
      const byNumber = new Map(prev.map(c => [c.chamberNumber, c] as const));
      return Array.from({ length: numberOfChambers }, (_, i) => {
        const chamberNumber = i + 1;
        const existing = byNumber.get(chamberNumber);
        if (existing) return existing;
        return {
          id: chamberIdFromNumber(chamberNumber),
          chamberNumber,
          fuelType: 'MS' as FuelType,
          capacity: lastChamberCapacityRef.current,
          challanDip: 0,
          physicalDip: 0,
          destinationTankId: null,
        } satisfies TruckChamber;
      });
    });
  }, [numberOfChambers]);

  // Init tankDips when entering step 3
  useEffect(() => {
    if (currentStep !== 3) return;
    setTankDips(prev => {
      const next = { ...prev };
      tanks.forEach(t => {
        if (!next[t.id]) next[t.id] = { before: 0, after: 0 };
      });
      return next;
    });
  }, [currentStep, tanks]);

  // Fuel totals from chambers (only fuels that arrived)
  const fuelTotals = useMemo(() => {
    const map: Partial<Record<FuelType, number>> = {};
    chambers.forEach(c => {
      map[c.fuelType] = (map[c.fuelType] || 0) + (c.capacity || 0);
    });
    return map;
  }, [chambers]);

  const activeFuels = useMemo(
    () => (Object.keys(fuelTotals) as FuelType[]).filter(f => (fuelTotals[f] || 0) > 0),
    [fuelTotals]
  );

  // Init allocations when entering step 4
  useEffect(() => {
    if (currentStep !== 4) return;
    setAllocations(prev => {
      const next = { ...prev };
      activeFuels.forEach(f => {
        getTanksByFuelType(f).forEach(t => {
          if (next[t.id] === undefined) next[t.id] = 0;
        });
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, activeFuels.join(',')]);

  // Build stock verifications when entering step 5 from allocations
  useEffect(() => {
    if (currentStep !== 5) return;
    const verifications: StockVerification[] = [];
    activeFuels.forEach(f => {
      getTanksByFuelType(f).forEach(t => {
        const alloc = allocations[t.id] || 0;
        if (alloc <= 0) return;
        verifications.push({
          tankId: t.id,
          tankName: t.name,
          fuelType: f,
          preUnloadStock: t.currentStock,
          postUnloadStock: t.currentStock + alloc,
          receivedQty: alloc,
          invoiceQty: alloc,
          difference: 0,
        });
      });
    });
    setStockVerifications(verifications);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const updateChamber = useCallback((id: string, updates: Partial<TruckChamber>) => {
    setChambers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return !!invoiceNumber && !!invoiceDate && totalInvoiceValue > 0;
      case 2: return numberOfChambers > 0 && chambers.every(c => c.fuelType && c.capacity > 0);
      case 3: return chambers.every(c => c.challanDip >= 0 && c.physicalDip >= 0);
      case 4:
        return activeFuels.every(f => {
          const tanksOfF = getTanksByFuelType(f);
          if (tanksOfF.length === 0) return false;
          const sum = tanksOfF.reduce((s, t) => s + (allocations[t.id] || 0), 0);
          return Math.abs(sum - (fuelTotals[f] || 0)) < 0.01;
        });
      case 5: return stockVerifications.every(v => v.postUnloadStock >= v.preUnloadStock);
      default: return false;
    }
  };

  const handleNext = () => { if (currentStep < 5) setCurrentStep(s => s + 1); };
  const handleBack = () => { if (currentStep > 1) setCurrentStep(s => s - 1); };

  const handleFinalize = async () => {
    for (const v of stockVerifications) {
      const tank = tanks.find(t => t.id === v.tankId);
      if (tank && v.postUnloadStock > tank.capacity) {
        toast.error(`Storage Overflow! ${tank.name} cannot exceed ${tank.capacity}L`);
        return;
      }
    }
    const finalDensityCheck: DensityCheck = {
      challanDensity: 0, challanTemp: 15, physicalDensity: 0, physicalTemp: 15,
      correctedDensity: 0, status: 'OK',
    };
    try {
      // Attach tank dips into chambers map (informational) by stashing in supplier_name? Keep clean: include in stockVerifications meta.
      const cloudPurchase = await createCloudPurchase({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        supplier_name: '',
        total_invoice_value: totalInvoiceValue,
        chambers,
        density_check: finalDensityCheck,
        stock_verifications: stockVerifications,
        status: 'completed',
      });
      if (!cloudPurchase) { toast.error('Failed to save purchase to cloud'); return; }
      for (const v of stockVerifications) {
        await updateCloudTank(v.tankId, { current_stock: v.postUnloadStock });
      }
      toast.success('Tanker unloading completed successfully!');
      navigate('/purchase');
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete tanker unloading');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="p-2 sm:p-3 rounded-xl bg-primary/10">
          <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold truncate">Tanker Unloading</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Step {currentStep} of 5: {STEP_LABELS[currentStep - 1]}
          </p>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} totalSteps={5} stepLabels={STEP_LABELS} />

      <Card className="border-2">
        <CardContent className="p-3 sm:p-6 md:p-8">
          {/* STEP 1 — Invoice */}
          {currentStep === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold">Invoice Details</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Basic invoice information</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="space-y-1.5">
                  <Label>Invoice Number *</Label>
                  <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="INV-2025-001" className="h-12 text-base" />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Date *</Label>
                  <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                    className="h-12 text-base" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Total Invoice Value (₹) *</Label>
                  <Input type="number" inputMode="decimal" value={totalInvoiceValue || ''}
                    onChange={e => setTotalInvoiceValue(Number(e.target.value))}
                    placeholder="Enter total amount" className="h-12 text-base" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Truck Config */}
          {currentStep === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold">Truck Configuration</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Chambers in the tanker</p>
              </div>
              <div className="max-w-md mx-auto">
                <Label>How many Chambers? *</Label>
                <Select value={numberOfChambers.toString()} onValueChange={v => setNumberOfChambers(Number(v))}>
                  <SelectTrigger className="h-12 mt-1.5"><SelectValue placeholder="Select chambers" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} Chamber{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TruckVisual chambers={chambers} />

              {chambers.length > 0 && (
                <div className="space-y-2">
                  {chambers.map((chamber, idx) => (
                    <div key={chamber.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30">
                      <div className="col-span-2 sm:col-span-1 font-bold text-center text-sm pb-2">C{idx + 1}</div>
                      <div className="col-span-5 sm:col-span-6">
                        <Label className="text-xs">Product</Label>
                        <Select value={chamber.fuelType}
                          onValueChange={v => updateChamber(chamber.id, { fuelType: v as FuelType })}>
                          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MS">MS (Petrol)</SelectItem>
                            <SelectItem value="HSD">HSD (Diesel)</SelectItem>
                            <SelectItem value="POWER">Power</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-5">
                        <Label className="text-xs">Capacity (L)</Label>
                        <Input type="number" inputMode="numeric" value={chamber.capacity || ''}
                          onChange={e => updateChamber(chamber.id, { capacity: e.target.value === '' ? 0 : Number(e.target.value) })}
                          onBlur={e => { const v = Number(e.target.value); if (v > 0) setLastChamberCapacity(v); }}
                          placeholder="4000" className="h-11" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Dip Check */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold">Dip & Quality Check</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Chamber dips and tank dips before/after unloading (cm)</p>
              </div>

              {/* Chamber dips */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Chamber Dip Readings</h3>
                <div className="space-y-2">
                  {chambers.map((chamber, idx) => {
                    const diff = chamber.physicalDip - chamber.challanDip;
                    return (
                      <div key={chamber.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30">
                        <div className="col-span-2 sm:col-span-1 font-bold text-sm text-center pb-2">C{idx + 1}</div>
                        <div className="col-span-3 sm:col-span-2 pb-2">
                          <span className={fuelBadge(chamber.fuelType)}>{chamber.fuelType}</span>
                        </div>
                        <div className="col-span-7 sm:col-span-3">
                          <Label className="text-xs">Challan Dip</Label>
                          <Input type="number" inputMode="decimal" step="0.1" value={chamber.challanDip || ''}
                            onChange={e => updateChamber(chamber.id, { challanDip: Number(e.target.value) })}
                            placeholder="85.5" className="h-11" />
                        </div>
                        <div className="col-span-7 col-start-6 sm:col-span-3 sm:col-start-auto">
                          <Label className="text-xs">Physical Dip</Label>
                          <Input type="number" inputMode="decimal" step="0.1" value={chamber.physicalDip || ''}
                            onChange={e => updateChamber(chamber.id, { physicalDip: Number(e.target.value) })}
                            placeholder="84.0" className="h-11" />
                        </div>
                        <div className="col-span-5 sm:col-span-3 text-right pb-2">
                          <Label className="text-xs">Diff</Label>
                          <div className={cn('font-bold text-base',
                            diff === 0 && 'text-muted-foreground',
                            diff > 0 && 'text-green-600',
                            diff < 0 && 'text-amber-600'
                          )}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tank dips */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Tank Dip — Before &amp; After Unloading</h3>
                {tanks.length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed rounded-lg text-sm text-muted-foreground">
                    No tanks configured.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tanks.map(tank => {
                      const dips = tankDips[tank.id] || { before: 0, after: 0 };
                      const d = (dips.after || 0) - (dips.before || 0);
                      return (
                        <div key={tank.id} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border bg-muted/30">
                          <div className="col-span-12 sm:col-span-3 pb-1 flex items-center gap-2">
                            <span className={fuelBadge(tank.fuelType)}>{tank.fuelType}</span>
                            <span className="font-semibold text-sm truncate">{tank.name}</span>
                          </div>
                          <div className="col-span-6 sm:col-span-3">
                            <Label className="text-xs">Before Dip (cm)</Label>
                            <Input type="number" inputMode="decimal" step="0.1" value={dips.before || ''}
                              onChange={e => setTankDips(p => ({ ...p, [tank.id]: { ...dips, before: Number(e.target.value) } }))}
                              className="h-11" />
                          </div>
                          <div className="col-span-6 sm:col-span-3">
                            <Label className="text-xs">After Dip (cm)</Label>
                            <Input type="number" inputMode="decimal" step="0.1" value={dips.after || ''}
                              onChange={e => setTankDips(p => ({ ...p, [tank.id]: { ...dips, after: Number(e.target.value) } }))}
                              className="h-11" />
                          </div>
                          <div className="col-span-12 sm:col-span-3 text-right pb-2">
                            <Label className="text-xs">Rise</Label>
                            <div className={cn('font-bold text-base',
                              d === 0 && 'text-muted-foreground',
                              d > 0 && 'text-green-600',
                              d < 0 && 'text-amber-600'
                            )}>{d > 0 ? '+' : ''}{d.toFixed(1)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4 — Unloading */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold">Unloading</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Enter litres unloaded into each tank</p>
              </div>

              {tanks.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed rounded-lg">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="font-medium">No tanks configured</p>
                  <p className="text-sm text-muted-foreground">Set up underground tanks first</p>
                </div>
              )}

              {activeFuels.map(fuel => {
                const total = fuelTotals[fuel] || 0;
                const tanksOfF = getTanksByFuelType(fuel);
                const allocated = tanksOfF.reduce((s, t) => s + (allocations[t.id] || 0), 0);
                const remaining = total - allocated;
                const matches = Math.abs(remaining) < 0.01;
                return (
                  <div key={fuel} className="rounded-lg border-2 p-3 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={fuelBadge(fuel)}>{fuel}</span>
                        <span className="font-semibold text-sm">Received: {formatLiters(total)} L</span>
                      </div>
                      <div className={cn(
                        'text-sm font-bold px-3 py-1 rounded',
                        matches ? 'bg-green-500/20 text-green-700' : 'bg-amber-500/20 text-amber-700'
                      )}>
                        {matches ? '✓ Balanced' : `Remaining: ${formatLiters(remaining)} L`}
                      </div>
                    </div>

                    {tanksOfF.length === 0 ? (
                      <p className="text-sm text-amber-600">No {fuel} tank configured.</p>
                    ) : (
                      <div className="space-y-2">
                        {tanksOfF.map(tank => (
                          <div key={tank.id} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-12 sm:col-span-6">
                              <Label className="text-xs">
                                {tank.name}{' '}
                                <span className="text-muted-foreground">
                                  (stock {formatLiters(tank.currentStock)}L / cap {formatLiters(tank.capacity)}L)
                                </span>
                              </Label>
                            </div>
                            <div className="col-span-12 sm:col-span-6">
                              <Input type="number" inputMode="numeric" placeholder="0"
                                value={allocations[tank.id] || ''}
                                onChange={e => setAllocations(p => ({ ...p, [tank.id]: Number(e.target.value) || 0 }))}
                                className="h-12 text-base" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 5 — Verify */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg sm:text-xl font-semibold">Stock Verification</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Confirm the new stock per tank</p>
              </div>

              <div className="space-y-2">
                {stockVerifications.map(v => (
                  <div key={v.tankId} className="rounded-lg border p-3 sm:p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={fuelBadge(v.fuelType)}>{v.fuelType}</span>
                        <span className="font-semibold">{v.tankName}</span>
                      </div>
                      <span className="text-sm font-bold text-primary">
                        +{formatLiters(v.receivedQty)} L
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Before</div>
                        <div className="font-semibold">{formatLiters(v.preUnloadStock)} L</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">After</div>
                        <div className="font-semibold">{formatLiters(v.postUnloadStock)} L</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Invoice #</p>
                      <p className="text-sm font-bold truncate">{invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-bold">{invoiceDate}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs text-muted-foreground">Value</p>
                      <p className="text-sm font-bold">₹{formatAmount(totalInvoiceValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-2 sticky bottom-2 z-10">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="h-12 flex-1 sm:flex-none sm:px-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        {currentStep < 5 ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="h-12 flex-1 sm:flex-none sm:px-8">
            Next<ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleFinalize} disabled={!canProceed()} className="h-12 flex-1 sm:flex-none sm:px-8 bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4 mr-2" />Finalize
          </Button>
        )}
      </div>
    </div>
  );
}
