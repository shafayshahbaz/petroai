import { useState, useMemo } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays } from 'date-fns';
import { 
  BadgeCheck, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  Phone,
  IndianRupee,
  Check,
  X,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function StaffSalary() {
  const { toast } = useToast();
  const { 
    staff, 
    attendance,
    addStaff, 
    updateStaff,
    deleteStaff,
    setAttendance,
    getAttendance,
    getStaffSalaryAdvances
  } = usePetrolPumpStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', designation: '', monthlySalary: 0 });
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const activeStaff = staff.filter((s) => s.isActive);
  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  const month = selectedMonth.getMonth();
  const year = selectedMonth.getFullYear();
  const daysInMonth = getDaysInMonth(selectedMonth);

  // Get attendance for selected staff
  const staffAttendance = useMemo(() => {
    if (!selectedStaffId) return [];
    return getAttendance(selectedStaffId, month, year);
  }, [selectedStaffId, month, year, attendance]);

  // Calculate salary details
  const salaryDetails = useMemo(() => {
    if (!selectedStaff) return null;

    const presentDays = staffAttendance.filter((a) => a.status === 'present').length;
    const halfDays = staffAttendance.filter((a) => a.status === 'half-day').length;
    const absentDays = staffAttendance.filter((a) => a.status === 'absent').length;
    const workingDays = presentDays + (halfDays * 0.5);
    
    const perDaySalary = selectedStaff.monthlySalary / daysInMonth;
    const basePay = perDaySalary * workingDays;
    const advances = getStaffSalaryAdvances(selectedStaffId!, month, year);
    const netPayable = Math.max(0, basePay - advances);

    return {
      presentDays,
      halfDays,
      absentDays,
      workingDays,
      perDaySalary,
      basePay,
      advances,
      netPayable,
    };
  }, [selectedStaff, staffAttendance, daysInMonth, selectedStaffId, month, year]);

  const handleAddStaff = () => {
    if (!newStaff.name.trim()) {
      toast({ title: 'Error', description: 'Please enter staff name', variant: 'destructive' });
      return;
    }
    addStaff(newStaff.name.trim(), newStaff.monthlySalary, newStaff.designation);
    setNewStaff({ name: '', phone: '', designation: '', monthlySalary: 0 });
    setIsAddDialogOpen(false);
    toast({ title: 'Staff Added', description: `${newStaff.name} has been added.` });
  };

  const handleAttendanceClick = (day: number) => {
    if (!selectedStaffId) return;
    
    const date = format(addDays(startOfMonth(selectedMonth), day - 1), 'yyyy-MM-dd');
    const existing = staffAttendance.find((a) => a.date === date);
    
    // Cycle through: none -> present -> absent -> half-day -> none
    let newStatus: 'present' | 'absent' | 'half-day';
    if (!existing) {
      newStatus = 'present';
    } else if (existing.status === 'present') {
      newStatus = 'absent';
    } else if (existing.status === 'absent') {
      newStatus = 'half-day';
    } else {
      // Remove by setting to present (could add a delete function later)
      newStatus = 'present';
    }
    
    setAttendance(selectedStaffId, date, newStatus);
  };

  const getAttendanceStatus = (day: number) => {
    if (!selectedStaffId) return null;
    const date = format(addDays(startOfMonth(selectedMonth), day - 1), 'yyyy-MM-dd');
    const record = staffAttendance.find((a) => a.date === date);
    return record?.status || null;
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BadgeCheck className="w-7 h-7" />
            Staff & Salary
          </h1>
          <p className="text-muted-foreground">Manage staff records, attendance, and payroll</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="Staff name"
                />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  value={newStaff.designation}
                  onChange={(e) => setNewStaff({ ...newStaff, designation: e.target.value })}
                  placeholder="e.g., Pump Operator"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Salary (₹)</Label>
                <Input
                  type="number"
                  value={newStaff.monthlySalary || ''}
                  onChange={(e) => setNewStaff({ ...newStaff, monthlySalary: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStaff}>Add Staff</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Staff List
            </CardTitle>
            <CardDescription>{activeStaff.length} active members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staff added yet
              </p>
            ) : (
              activeStaff.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStaffId(s.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedStaffId === s.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.designation && (
                        <p className="text-xs text-muted-foreground">{s.designation}</p>
                      )}
                    </div>
                    <Badge variant="secondary">{formatCurrency(s.monthlySalary)}/mo</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Attendance Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Attendance Calendar
                </CardTitle>
                <CardDescription>
                  {selectedStaff ? `${selectedStaff.name}'s attendance` : 'Select a staff member'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-[120px] text-center">
                  {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedStaff ? (
              <div className="text-center py-12 text-muted-foreground">
                Select a staff member to mark attendance
              </div>
            ) : (
              <>
                {/* Legend */}
                <div className="flex gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-emerald-500" />
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-red-500" />
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-amber-500" />
                    <span>Half Day</span>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for start of month */}
                  {Array.from({ length: startOfMonth(selectedMonth).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  
                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const status = getAttendanceStatus(day);
                    return (
                      <button
                        key={day}
                        onClick={() => handleAttendanceClick(day)}
                        className={cn(
                          "aspect-square rounded-lg border flex items-center justify-center font-medium text-sm transition-colors",
                          status === 'present' && "bg-emerald-500 text-white border-emerald-600",
                          status === 'absent' && "bg-red-500 text-white border-red-600",
                          status === 'half-day' && "bg-amber-500 text-white border-amber-600",
                          !status && "hover:bg-muted"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <Separator className="my-6" />

                {/* Salary Calculation */}
                {salaryDetails && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      Salary Calculation - {format(selectedMonth, 'MMMM yyyy')}
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                        <Check className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                        <p className="text-2xl font-bold text-emerald-600">{salaryDetails.presentDays}</p>
                        <p className="text-xs text-muted-foreground">Present</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-amber-500/10">
                        <Clock className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                        <p className="text-2xl font-bold text-amber-600">{salaryDetails.halfDays}</p>
                        <p className="text-xs text-muted-foreground">Half Days</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-red-500/10">
                        <X className="w-5 h-5 mx-auto text-red-600 mb-1" />
                        <p className="text-2xl font-bold text-red-600">{salaryDetails.absentDays}</p>
                        <p className="text-xs text-muted-foreground">Absent</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-primary/10">
                        <CalendarIcon className="w-5 h-5 mx-auto text-primary mb-1" />
                        <p className="text-2xl font-bold text-primary">{salaryDetails.workingDays}</p>
                        <p className="text-xs text-muted-foreground">Working Days</p>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Per Day Salary</span>
                        <span className="font-mono">{formatCurrency(salaryDetails.perDaySalary)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Base Pay ({salaryDetails.workingDays} days)</span>
                        <span className="font-mono">{formatCurrency(salaryDetails.basePay)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span>(-) Salary Advances</span>
                        <span className="font-mono">- {formatCurrency(salaryDetails.advances)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Net Payable</span>
                        <span className="font-mono text-primary">{formatCurrency(salaryDetails.netPayable)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}