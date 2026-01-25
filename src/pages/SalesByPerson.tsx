import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { 
  Users, 
  Plus, 
  CalendarIcon, 
  Trash2, 
  Save,
  Clock,
  Wallet,
  CreditCard,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { FuelType, ShiftEntry, ShiftNozzleReading, DEFAULT_FUEL_RATES } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

const FUEL_COLORS: Record<FuelType, string> = {
  MS: 'bg-orange-500',
  HSD: 'bg-blue-500',
  POWER: 'bg-rose-500',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
}

// Get business date label
function getBusinessDateLabel(date: Date): string {
  const prevDay = subDays(date, 1);
  return `${format(prevDay, 'dd MMM')} 7PM - ${format(date, 'dd MMM')} 7PM`;
}

export default function SalesByPerson() {
  const { toast } = useToast();
  const { 
    staff, 
    machines, 
    tanks,
    shiftEntries, 
    addStaff, 
    deleteStaff,
    addShiftEntry,
    deleteShiftEntry,
    getLastShiftClosingReadings
  } = usePetrolPumpStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [businessDate, setBusinessDate] = useState<Date>(new Date());
  const [newStaffName, setNewStaffName] = useState('');
  
  // Form state
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedNozzleIds, setSelectedNozzleIds] = useState<string[]>([]);
  const [nozzleReadings, setNozzleReadings] = useState<Record<string, { opening: number; closing: number }>>({});
  const [upiCollection, setUpiCollection] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [salaryAdvance, setSalaryAdvance] = useState(0);
  const [creditSales, setCreditSales] = useState(0);

  // Get all nozzles with machine info
  const allNozzles = useMemo(() => {
    const nozzles: Array<{
      id: string;
      label: string;
      machineId: string;
      machineName: string;
      fuelType: FuelType;
      tankId: string;
    }> = [];
    
    machines.forEach((machine) => {
      machine.nozzles.forEach((nozzle) => {
        nozzles.push({
          id: nozzle.id,
          label: `${machine.name} - ${nozzle.label}`,
          machineId: machine.id,
          machineName: machine.name,
          fuelType: nozzle.fuelType,
          tankId: nozzle.tankId,
        });
      });
    });
    
    return nozzles;
  }, [machines]);

  // Calculate totals for current form
  const formTotals = useMemo(() => {
    let totalLiters = 0;
    let totalAmount = 0;
    
    selectedNozzleIds.forEach((nozzleId) => {
      const nozzle = allNozzles.find((n) => n.id === nozzleId);
      const readings = nozzleReadings[nozzleId];
      if (nozzle && readings) {
        const liters = Math.max(0, readings.closing - readings.opening);
        const rate = DEFAULT_FUEL_RATES[nozzle.fuelType];
        totalLiters += liters;
        totalAmount += liters * rate;
      }
    });
    
    const totalDeductions = upiCollection + expenses + salaryAdvance + creditSales;
    const netCash = totalAmount - totalDeductions;
    
    return { totalLiters, totalAmount, totalDeductions, netCash };
  }, [selectedNozzleIds, nozzleReadings, allNozzles, upiCollection, expenses, salaryAdvance, creditSales]);

  // Filter entries for selected business date
  const todayEntries = useMemo(() => {
    const dateStr = format(businessDate, 'yyyy-MM-dd');
    return shiftEntries.filter((e) => e.businessDate === dateStr);
  }, [shiftEntries, businessDate]);

  const handleAddStaff = () => {
    if (!newStaffName.trim()) {
      toast({ title: 'Error', description: 'Please enter staff name', variant: 'destructive' });
      return;
    }
    addStaff(newStaffName.trim());
    setNewStaffName('');
    setIsStaffDialogOpen(false);
    toast({ title: 'Staff Added', description: `${newStaffName} has been added.` });
  };

  const handleNozzleToggle = (nozzleId: string) => {
    setSelectedNozzleIds((prev) => {
      if (prev.includes(nozzleId)) {
        return prev.filter((id) => id !== nozzleId);
      }
      // Get last closing reading for this nozzle
      const lastReadings = getLastShiftClosingReadings(format(businessDate, 'yyyy-MM-dd'));
      const opening = lastReadings[nozzleId] || 0;
      setNozzleReadings((prevReadings) => ({
        ...prevReadings,
        [nozzleId]: { opening, closing: opening },
      }));
      return [...prev, nozzleId];
    });
  };

  const handleSubmitShift = () => {
    if (!selectedStaffId) {
      toast({ title: 'Error', description: 'Please select a staff member', variant: 'destructive' });
      return;
    }
    if (selectedNozzleIds.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one nozzle', variant: 'destructive' });
      return;
    }

    const staffMember = staff.find((s) => s.id === selectedStaffId);
    if (!staffMember) return;

    const readings: ShiftNozzleReading[] = selectedNozzleIds.map((nozzleId) => {
      const nozzle = allNozzles.find((n) => n.id === nozzleId)!;
      const r = nozzleReadings[nozzleId] || { opening: 0, closing: 0 };
      const liters = Math.max(0, r.closing - r.opening);
      const rate = DEFAULT_FUEL_RATES[nozzle.fuelType];
      return {
        nozzleId,
        nozzleLabel: nozzle.label,
        machineId: nozzle.machineId,
        machineName: nozzle.machineName,
        fuelType: nozzle.fuelType,
        tankId: nozzle.tankId,
        openingReading: r.opening,
        closingReading: r.closing,
        rate,
        liters,
        amount: liters * rate,
      };
    });

    addShiftEntry({
      businessDate: format(businessDate, 'yyyy-MM-dd'),
      staffId: selectedStaffId,
      staffName: staffMember.name,
      nozzleReadings: readings,
      totalLiters: formTotals.totalLiters,
      totalAmount: formTotals.totalAmount,
      upiCollection,
      expenses,
      salaryAdvance,
      creditSales,
      netCashToHandover: formTotals.netCash,
    });

    // Reset form
    setSelectedStaffId('');
    setSelectedNozzleIds([]);
    setNozzleReadings({});
    setUpiCollection(0);
    setExpenses(0);
    setSalaryAdvance(0);
    setCreditSales(0);
    setIsDialogOpen(false);

    toast({ title: 'Shift Entry Saved', description: `${staffMember.name}'s shift has been recorded.` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7" />
            Sales by Person
          </h1>
          <p className="text-muted-foreground">Track individual staff shift sales and handovers</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label>Staff Name</Label>
                <Input
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Enter staff name"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsStaffDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddStaff}>Add Staff</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Shift Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Shift Entry</DialogTitle>
                <DialogDescription>Record sales for a staff member's shift</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Business Date */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Business Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(businessDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={businessDate}
                          onSelect={(date) => date && setBusinessDate(date)}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      {getBusinessDateLabel(businessDate)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Staff Member</Label>
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.filter((s) => s.isActive).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nozzle Selection */}
                <div className="space-y-3">
                  <Label>Select Nozzles Handled</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allNozzles.map((nozzle) => (
                      <Button
                        key={nozzle.id}
                        type="button"
                        variant={selectedNozzleIds.includes(nozzle.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleNozzleToggle(nozzle.id)}
                        className="justify-start"
                      >
                        <span className={cn("w-2 h-2 rounded-full mr-2", FUEL_COLORS[nozzle.fuelType])} />
                        {nozzle.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Nozzle Readings */}
                {selectedNozzleIds.length > 0 && (
                  <div className="space-y-3">
                    <Label>Meter Readings</Label>
                    <div className="space-y-2">
                      {selectedNozzleIds.map((nozzleId) => {
                        const nozzle = allNozzles.find((n) => n.id === nozzleId);
                        const readings = nozzleReadings[nozzleId] || { opening: 0, closing: 0 };
                        const liters = Math.max(0, readings.closing - readings.opening);
                        const amount = liters * (nozzle ? DEFAULT_FUEL_RATES[nozzle.fuelType] : 0);
                        
                        return (
                          <div key={nozzleId} className="grid grid-cols-5 gap-2 items-center bg-muted/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", FUEL_COLORS[nozzle?.fuelType || 'MS'])} />
                              <span className="text-sm font-medium truncate">{nozzle?.label}</span>
                            </div>
                            <Input
                              type="number"
                              value={readings.opening || ''}
                              onChange={(e) => setNozzleReadings((prev) => ({
                                ...prev,
                                [nozzleId]: { ...prev[nozzleId], opening: parseFloat(e.target.value) || 0 },
                              }))}
                              placeholder="Opening"
                              className="text-right font-mono"
                            />
                            <Input
                              type="number"
                              value={readings.closing || ''}
                              onChange={(e) => setNozzleReadings((prev) => ({
                                ...prev,
                                [nozzleId]: { ...prev[nozzleId], closing: parseFloat(e.target.value) || 0 },
                              }))}
                              placeholder="Closing"
                              className="text-right font-mono"
                            />
                            <div className="text-right font-mono text-sm">
                              {formatNumber(liters)} L
                            </div>
                            <div className="text-right font-mono text-sm font-semibold">
                              {formatCurrency(amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Deductions */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Deductions from Cash
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> UPI/QR Collection
                      </Label>
                      <Input
                        type="number"
                        value={upiCollection || ''}
                        onChange={(e) => setUpiCollection(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> Expenses Paid
                      </Label>
                      <Input
                        type="number"
                        value={expenses || ''}
                        onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Salary Advance</Label>
                      <Input
                        type="number"
                        value={salaryAdvance || ''}
                        onChange={(e) => setSalaryAdvance(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Credit/Debtor Sale</Label>
                      <Input
                        type="number"
                        value={creditSales || ''}
                        onChange={(e) => setCreditSales(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Sales</span>
                      <span className="font-mono">{formatCurrency(formTotals.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Total Liters</span>
                      <span className="font-mono">{formatNumber(formTotals.totalLiters)} L</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Total Deductions</span>
                      <span className="font-mono">- {formatCurrency(formTotals.totalDeductions)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Net Cash to Handover</span>
                      <span className="font-mono text-primary">{formatCurrency(formTotals.netCash)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmitShift}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Shift Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Business Date Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Label>View Business Date:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(businessDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={businessDate}
                  onSelect={(date) => date && setBusinessDate(date)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Badge variant="secondary">{getBusinessDateLabel(businessDate)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>Manage your team</CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No staff added yet. Click "Add Staff" to start.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {staff.filter((s) => s.isActive).map((s) => (
                <Badge key={s.id} variant="outline" className="px-3 py-1.5 gap-2">
                  {s.name}
                  <button 
                    onClick={() => deleteStaff(s.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Shift Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Entries for {format(businessDate, 'dd MMM yyyy')}</CardTitle>
          <CardDescription>All staff entries for this business date</CardDescription>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries for this date. Click "Add Shift Entry" to record a shift.</p>
          ) : (
            <div className="space-y-4">
              {todayEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{entry.staffName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {entry.nozzleReadings.length} nozzle(s) handled
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteShiftEntry(entry.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground text-xs">Total Sales</p>
                      <p className="font-mono font-semibold">{formatCurrency(entry.totalAmount)}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground text-xs">UPI Collection</p>
                      <p className="font-mono">{formatCurrency(entry.upiCollection)}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground text-xs">Deductions</p>
                      <p className="font-mono text-destructive">
                        {formatCurrency(entry.expenses + entry.salaryAdvance + entry.creditSales)}
                      </p>
                    </div>
                    <div className="bg-primary/10 rounded p-2">
                      <p className="text-muted-foreground text-xs">Net Cash</p>
                      <p className="font-mono font-bold text-primary">{formatCurrency(entry.netCashToHandover)}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Day Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Day Total (All Staff)</span>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-primary">
                      {formatCurrency(todayEntries.reduce((sum, e) => sum + e.netCashToHandover, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Sales: {formatCurrency(todayEntries.reduce((sum, e) => sum + e.totalAmount, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
