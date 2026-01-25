import { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StepIndicator } from './StepIndicator';
import { TruckVisual } from './TruckVisual';
import { DensityCalculator } from './DensityCalculator';
import { usePurchaseStore } from '@/store/purchase-store';
import { TruckChamber, DensityCheck, StockVerification, calculateCorrectedDensity } from '@/types/purchase';
import { FuelType } from '@/types/petrol-pump';
import { formatAmount, formatLiters } from '@/lib/format';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEP_LABELS = [
  'Invoice Header',
  'Truck Config',
  'Quality Check',
  'Unloading',
  'Verification',
];

const generateId = () => Math.random().toString(36).substring(2, 15);

export function TankerUnloadingWizard() {
  const navigate = useNavigate();
  const { 
    tanks, 
    initializeTanks, 
    savePurchase, 
    finalizeUnloading, 
    getTanksByFuelType, 
    lastChamberCapacity, 
    setLastChamberCapacity,
    validateTankCapacity,
    getLastPrice,
    setLastPrice
  } = usePurchaseStore();
  
  // Initialize tanks on mount
  useEffect(() => {
    initializeTanks();
  }, [initializeTanks]);

  const [currentStep, setCurrentStep] = useState(1);
  
  // Scroll to top when step changes
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);
  
  // Step 1: Invoice Header
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierPlace, setSupplierPlace] = useState('');
  const [totalInvoiceValue, setTotalInvoiceValue] = useState<number>(0);
  
  // Step 2: Truck Config
  const [numberOfChambers, setNumberOfChambers] = useState<number>(0);
  const [chambers, setChambers] = useState<TruckChamber[]>([]);
  
  // Step 3: Quality Check
  const [densityCheck, setDensityCheck] = useState<DensityCheck>({
    challanDensity: 0,
    challanTemp: 15,
    physicalDensity: 0,
    physicalTemp: 15,
    correctedDensity: 0,
    status: 'OK',
  });
  
  // Step 5: Stock Verification
  const [stockVerifications, setStockVerifications] = useState<StockVerification[]>([]);

  // Generate chambers when number changes
  useEffect(() => {
    if (numberOfChambers > 0) {
      const newChambers: TruckChamber[] = Array.from({ length: numberOfChambers }, (_, i) => ({
        id: generateId(),
        chamberNumber: i + 1,
        fuelType: 'MS' as FuelType,
        capacity: lastChamberCapacity, // Use remembered capacity (default 3000L)
        challanDip: 0,
        physicalDip: 0,
        destinationTankId: null,
      }));
      setChambers(newChambers);
    } else {
      setChambers([]);
    }
  }, [numberOfChambers, lastChamberCapacity]);

  // Generate stock verifications based on selected tanks in step 4
  useEffect(() => {
    if (currentStep === 5) {
      const uniqueTankIds = [...new Set(chambers.map(c => c.destinationTankId).filter(Boolean))];
      const verifications: StockVerification[] = uniqueTankIds.map(tankId => {
        const tank = tanks.find(t => t.id === tankId);
        const chambersForTank = chambers.filter(c => c.destinationTankId === tankId);
        const totalInvoiceQty = chambersForTank.reduce((sum, c) => sum + c.capacity, 0);
        
        return {
          tankId: tankId!,
          tankName: tank?.name || '',
          fuelType: tank?.fuelType || 'MS',
          preUnloadStock: tank?.currentStock || 0,
          postUnloadStock: (tank?.currentStock || 0) + totalInvoiceQty,
          receivedQty: 0,
          invoiceQty: totalInvoiceQty,
          difference: 0,
        };
      });
      setStockVerifications(verifications);
    }
  }, [currentStep, chambers, tanks]);

  const updateChamber = useCallback((chamberId: string, updates: Partial<TruckChamber>) => {
    setChambers(prev => prev.map(c => 
      c.id === chamberId ? { ...c, ...updates } : c
    ));
    // If capacity is updated, remember it for future entries
    if (updates.capacity && updates.capacity > 0) {
      setLastChamberCapacity(updates.capacity);
    }
  }, [setLastChamberCapacity]);

  const updateVerification = useCallback((tankId: string, updates: Partial<StockVerification>) => {
    setStockVerifications(prev => prev.map(v => {
      if (v.tankId === tankId) {
        const updated = { ...v, ...updates };
        updated.receivedQty = updated.postUnloadStock - updated.preUnloadStock;
        updated.difference = updated.receivedQty - updated.invoiceQty;
        return updated;
      }
      return v;
    }));
  }, []);

  // Check if all chamber dip differences are within ±3
  const allDipsWithinTolerance = chambers.every(c => {
    const diff = c.physicalDip - c.challanDip;
    return Math.abs(diff) <= 3;
  });

  // Compute overall density status based on chamber dips
  const computedDensityStatus: 'OK' | 'FAIL' = allDipsWithinTolerance ? 'OK' : 'FAIL';

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!invoiceNumber && !!invoiceDate && !!supplierPlace && totalInvoiceValue > 0;
      case 2:
        return numberOfChambers > 0 && chambers.every(c => c.fuelType && c.capacity > 0);
      case 3:
        return chambers.every(c => c.challanDip > 0 && c.physicalDip > 0);
      case 4:
        return chambers.every(c => c.destinationTankId !== null);
      case 5:
        return stockVerifications.every(v => v.postUnloadStock >= v.preUnloadStock);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalize = () => {
    // Validate tank capacities before finalizing
    for (const verification of stockVerifications) {
      const tank = tanks.find(t => t.id === verification.tankId);
      if (tank && verification.postUnloadStock > tank.capacity) {
        toast.error(`Storage Overflow! ${tank.name} cannot exceed capacity of ${tank.capacity}L`);
        return;
      }
    }

    // Save the purchase entry with computed density status
    const finalDensityCheck: DensityCheck = {
      ...densityCheck,
      status: computedDensityStatus,
    };
    
    const purchase = savePurchase({
      invoiceNumber,
      invoiceDate,
      supplierName: supplierPlace, // Using supplierPlace now
      totalInvoiceValue,
      chambers,
      densityCheck: finalDensityCheck,
      stockVerifications,
      status: 'completed',
    });

    // Update tank stocks
    finalizeUnloading(purchase.id, stockVerifications);

    // Remember the price per liter for each fuel type for next invoice
    const totalQtyByFuel: Record<string, number> = {};
    chambers.forEach(c => {
      totalQtyByFuel[c.fuelType] = (totalQtyByFuel[c.fuelType] || 0) + c.capacity;
    });
    // We don't have per-fuel price here, but this framework allows for future enhancement

    toast.success('Tanker unloading completed successfully!');
    navigate('/purchase');
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-xl bg-primary/10">
          <Truck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tanker Unloading Wizard</h1>
          <p className="text-muted-foreground">Step {currentStep} of 5: {STEP_LABELS[currentStep - 1]}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator 
        currentStep={currentStep} 
        totalSteps={5} 
        stepLabels={STEP_LABELS} 
      />

      {/* Step Content */}
      <Card className="border-2">
        <CardContent className="p-8">
          {/* STEP 1: Invoice Header */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold">Invoice Details</h2>
                <p className="text-muted-foreground">Enter the basic invoice information</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <Label className="text-base">Invoice Number *</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g., INV-2025-001"
                    className="h-14 text-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base">Invoice Date *</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-base">Supplier Place (Depot) *</Label>
                  <Input
                    value={supplierPlace}
                    onChange={(e) => setSupplierPlace(e.target.value)}
                    placeholder="e.g., Barauni"
                    className="h-14 text-lg"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-base">Total Invoice Value (₹) *</Label>
                  <Input
                    type="number"
                    value={totalInvoiceValue || ''}
                    onChange={(e) => setTotalInvoiceValue(Number(e.target.value))}
                    placeholder="Enter total amount"
                    className="h-14 text-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Truck Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold">Truck Configuration</h2>
                <p className="text-muted-foreground">Configure the tanker truck chambers</p>
              </div>

              <div className="max-w-md mx-auto mb-8">
                <Label className="text-base">How many Chambers in this Truck? *</Label>
                <Select
                  value={numberOfChambers.toString()}
                  onValueChange={(val) => setNumberOfChambers(Number(val))}
                >
                  <SelectTrigger className="h-14 text-lg mt-2">
                    <SelectValue placeholder="Select chambers" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} Chamber{n > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Truck Visual */}
              <TruckVisual chambers={chambers} className="mb-8" />

              {/* Chamber Details */}
              {chambers.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Chamber</TableHead>
                      <TableHead>Product Type</TableHead>
                      <TableHead>Capacity (Liters)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chambers.map((chamber, index) => (
                      <TableRow key={chamber.id}>
                        <TableCell className="font-medium">C{index + 1}</TableCell>
                        <TableCell>
                          <Select
                            value={chamber.fuelType}
                            onValueChange={(val) => updateChamber(chamber.id, { fuelType: val as FuelType })}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MS">MS (Petrol)</SelectItem>
                              <SelectItem value="HSD">HSD (Diesel)</SelectItem>
                              <SelectItem value="POWER">Power</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={chamber.capacity || ''}
                            onChange={(e) => updateChamber(chamber.id, { capacity: Number(e.target.value) })}
                            placeholder="e.g., 4000"
                            className="h-12"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* STEP 3: Quality & Dip Check */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold">Quality & Dip Check</h2>
                <p className="text-muted-foreground">Verify chamber dips and fuel density</p>
              </div>

              {/* Overall Status Banner */}
              <div className={cn(
                "p-4 rounded-xl border-2 text-center",
                computedDensityStatus === 'OK' 
                  ? "bg-green-500/10 border-green-500" 
                  : "bg-destructive/10 border-destructive"
              )}>
                <div className="flex items-center justify-center gap-3">
                  {computedDensityStatus === 'OK' ? (
                    <Check className="w-8 h-8 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-destructive animate-pulse" />
                  )}
                  <span className={cn(
                    "text-2xl font-bold",
                    computedDensityStatus === 'OK' ? "text-green-500" : "text-destructive"
                  )}>
                    {computedDensityStatus === 'OK' ? 'QUALITY OK' : 'DIP VARIANCE FAIL'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  All chamber differences must be within ±3 cm
                </p>
              </div>

              {/* Chamber Dip Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Chamber Dip Readings</CardTitle>
                  <CardDescription>Compare challan dip with physical measurement (tolerance: ±3 cm)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chamber</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Challan Dip (cm)</TableHead>
                        <TableHead>Physical Dip (cm)</TableHead>
                        <TableHead>Difference</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chambers.map((chamber, index) => {
                        const diff = chamber.physicalDip - chamber.challanDip;
                        const isWithinTolerance = Math.abs(diff) <= 3;
                        return (
                          <TableRow key={chamber.id}>
                            <TableCell className="font-medium">C{index + 1}</TableCell>
                            <TableCell>{chamber.fuelType}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={chamber.challanDip || ''}
                                onChange={(e) => updateChamber(chamber.id, { challanDip: Number(e.target.value) })}
                                placeholder="0"
                                className="h-12 w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={chamber.physicalDip || ''}
                                onChange={(e) => updateChamber(chamber.id, { physicalDip: Number(e.target.value) })}
                                placeholder="0"
                                className="h-12 w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "font-bold text-lg",
                                isWithinTolerance ? "text-green-500" : "text-destructive"
                              )}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-bold",
                                isWithinTolerance 
                                  ? "bg-green-500/20 text-green-600" 
                                  : "bg-destructive/20 text-destructive"
                              )}>
                                {isWithinTolerance ? 'OK' : 'FAIL'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Density Calculator - Simplified */}
              <DensityCalculator
                densityCheck={densityCheck}
                onChange={setDensityCheck}
              />
            </div>
          )}

          {/* STEP 4: Unloading Strategy */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold">Unloading Strategy</h2>
                <p className="text-muted-foreground">Select destination tank for each chamber</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chamber</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Destination Tank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chambers.map((chamber, index) => {
                    const availableTanks = getTanksByFuelType(chamber.fuelType);
                    return (
                      <TableRow key={chamber.id}>
                        <TableCell className="font-medium">C{index + 1}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2 py-1 rounded text-sm font-medium",
                            chamber.fuelType === 'MS' && "bg-orange-500/20 text-orange-600",
                            chamber.fuelType === 'HSD' && "bg-blue-500/20 text-blue-600",
                            chamber.fuelType === 'POWER' && "bg-pink-500/20 text-pink-600"
                          )}>
                            {chamber.fuelType}
                          </span>
                        </TableCell>
                        <TableCell>{formatLiters(chamber.capacity)} L</TableCell>
                        <TableCell>
                          <Select
                            value={chamber.destinationTankId || ''}
                            onValueChange={(val) => updateChamber(chamber.id, { destinationTankId: val })}
                          >
                            <SelectTrigger className="h-12 w-56">
                              <SelectValue placeholder="Select tank" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTanks.map((tank) => (
                                <SelectItem key={tank.id} value={tank.id}>
                                  {tank.name} ({formatLiters(tank.currentStock)}L)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {tanks.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                  <p className="text-lg font-medium">No tanks configured</p>
                  <p className="text-muted-foreground">Please set up underground tanks first</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Stock Verification */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold">Stock Verification</h2>
                <p className="text-muted-foreground">Verify received quantity against invoice</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tank</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Pre-Unload Stock (L)</TableHead>
                    <TableHead>Post-Unload Stock (L)</TableHead>
                    <TableHead>Received Qty (L)</TableHead>
                    <TableHead>Invoice Qty (L)</TableHead>
                    <TableHead>Shortage/Excess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockVerifications.map((verification) => (
                    <TableRow key={verification.tankId}>
                      <TableCell className="font-medium">{verification.tankName}</TableCell>
                      <TableCell>{verification.fuelType}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={verification.preUnloadStock || ''}
                          onChange={(e) => updateVerification(verification.tankId, { 
                            preUnloadStock: Number(e.target.value) 
                          })}
                          className="h-12 w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={verification.postUnloadStock || ''}
                          onChange={(e) => updateVerification(verification.tankId, { 
                            postUnloadStock: Number(e.target.value) 
                          })}
                          className="h-12 w-28"
                        />
                      </TableCell>
                      <TableCell className="font-bold text-lg">
                        {formatLiters(verification.receivedQty)}
                      </TableCell>
                      <TableCell>{formatLiters(verification.invoiceQty)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-bold text-lg",
                          verification.difference === 0 && "text-muted-foreground",
                          verification.difference > 0 && "text-green-500",
                          verification.difference < 0 && "text-destructive"
                        )}>
                          {verification.difference > 0 ? '+' : ''}
                          {formatLiters(verification.difference)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Summary */}
              <Card className="bg-muted/30">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="text-lg font-bold">{invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Depot</p>
                      <p className="text-lg font-bold">{supplierPlace}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice Value</p>
                      <p className="text-lg font-bold">₹{formatAmount(totalInvoiceValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quality Status</p>
                      <p className={cn(
                        "text-lg font-bold",
                        computedDensityStatus === 'OK' ? "text-green-500" : "text-destructive"
                      )}>
                        {computedDensityStatus}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="h-12 px-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < 5 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="h-12 px-8"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleFinalize}
            disabled={!canProceed()}
            className="h-12 px-8 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Finalize & Add to Stock
          </Button>
        )}
      </div>
    </div>
  );
}
