import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { 
  Edit, 
  Trash2, 
  Printer, 
  Search, 
  Calendar,
  Loader2,
  Download,
  CalendarRange,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { calculateTotals } from '@/store/petrol-pump-store';
import { useCloudData, CloudDailyEntry } from '@/contexts/CloudDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DailyEntry, FuelType } from '@/types/petrol-pump';
import { PrintableReport } from '@/components/report/PrintableReport';
import { deleteDailySale, buildNozzleTankMap, revertDebtorOutstanding } from '@/services/transactionService';
import { useSettingsStore } from '@/store/settings-store';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to convert cloud entry to local format for calculations
function cloudToLocalEntry(cloudEntry: CloudDailyEntry): DailyEntry {
  return {
    id: cloudEntry.id,
    date: cloudEntry.date,
    shiftName: cloudEntry.shift_name || undefined,
    fuelRates: cloudEntry.fuel_rates as Record<FuelType, number>,
    nozzles: cloudEntry.nozzles as any[],
    lubeItems: cloudEntry.lube_items as any[],
    expenses: cloudEntry.expenses as any[],
    incomes: cloudEntry.incomes as any[],
    creditSales: cloudEntry.credit_sales as any[],
    upiCollection: cloudEntry.upi_collection,
    cashDeposit: cloudEntry.cash_deposit,
    openingBalance: cloudEntry.opening_balance,
    testingDeduction: cloudEntry.testing_deduction as Record<FuelType, number>,
    createdAt: cloudEntry.created_at,
    updatedAt: cloudEntry.updated_at,
  };
}

export default function SalesReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);
  const [printEntry, setPrintEntry] = useState<DailyEntry | null>(null);
  const [printEntries, setPrintEntries] = useState<DailyEntry[]>([]); // Multi-date print
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const { businessProfile } = useSettingsStore();
  const originalTitleRef = useRef(document.title);
  
  const { dailyEntries: cloudEntries, nozzles: cloudNozzles, isOnline, refreshData } = useCloudData();
  const { clientId } = useAuth();

  // Convert cloud entries to local format for display
  const entries = useMemo(() => 
    cloudEntries.map(cloudToLocalEntry),
    [cloudEntries]
  );

  useEffect(() => {
    const onAfterPrint = () => {
      setPrintEntry(null);
      setPrintEntries([]);
      document.title = originalTitleRef.current;
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const filteredEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((entry) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          entry.date.includes(query) ||
          entry.shiftName?.toLowerCase().includes(query)
        );
      });
  }, [entries, searchQuery]);

  const handleEdit = (entry: DailyEntry) => {
    navigate(`/daily-entry?edit=${entry.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!isOnline || !clientId) {
      toast({
        title: 'Cannot Delete',
        description: !isOnline ? 'You are currently offline' : 'Client ID not found',
        variant: 'destructive',
      });
      return;
    }
    
    setDeletingId(id);
    
    try {
      const cloudEntry = cloudEntries.find(e => e.id === id);
      if (cloudEntry?.credit_sales) {
        await revertDebtorOutstanding(
          (cloudEntry.credit_sales as any[]).map(cs => ({
            debtorId: cs.debtorId,
            amount: cs.amount,
          }))
        );
      }
      
      const nozzleTankMap = buildNozzleTankMap(cloudNozzles);
      const result = await deleteDailySale(clientId, id, nozzleTankMap);
      
      if (!result.success) {
        throw new Error('Failed to delete entry');
      }
      
      await refreshData();
      
      toast({
        title: 'Entry Deleted',
        description: 'The daily entry has been deleted and stock levels restored.',
      });
    } catch (error: any) {
      console.error('Error deleting entry:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete entry',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = (entry: DailyEntry) => {
    setSelectedEntry(entry);
  };

  const executePrint = () => {
    if (!selectedEntry) return;

    originalTitleRef.current = document.title;
    const entryDate = parseISO(selectedEntry.date);
    const companyName = businessProfile.companyName || 'Report';
    const formattedDate = format(entryDate, 'dd-MM-yyyy');
    document.title = `${companyName} ${formattedDate}`;

    setPrintEntry(selectedEntry);
    setSelectedEntry(null);

    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 100);
    });
  };

  // Multi-date download
  const handleDownloadReport = () => {
    if (!dateFrom || !dateTo) {
      toast({ title: 'Select Dates', description: 'Please select both From and To dates.', variant: 'destructive' });
      return;
    }

    const fromStart = startOfDay(dateFrom);
    const toEnd = endOfDay(dateTo);

    const filtered = entries
      .filter(entry => {
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, { start: fromStart, end: toEnd });
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (filtered.length === 0) {
      toast({ title: 'No Entries', description: 'No entries found in the selected date range.', variant: 'destructive' });
      return;
    }

    originalTitleRef.current = document.title;
    const companyName = businessProfile.companyName || 'Report';
    const fromStr = format(dateFrom, 'dd-MM-yyyy');
    const toStr = format(dateTo, 'dd-MM-yyyy');
    document.title = `${companyName} ${fromStr} to ${toStr}`;

    setPrintEntries(filtered);
    setShowDownloadDialog(false);

    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 100);
    });
  };

  return (
    <>
      <div className="no-print space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales Report</h1>
            <p className="text-muted-foreground">
              View and manage all daily entries
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDownloadDialog(true)}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            <Button onClick={() => navigate('/daily-entry')}>
              + New Entry
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by date or shift name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Entries ({filteredEntries.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No entries found.</p>
                {entries.length === 0 && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/daily-entry')}
                  >
                    Create First Entry
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Total Sales</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Cash in Hand</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => {
                      const totals = calculateTotals(entry);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {format(parseISO(entry.date), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{entry.shiftName || '-'}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-destructive">
                            {formatCurrency(totals.totalExpenses)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-success">
                            {formatCurrency(totals.cashInHand)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePrint(entry)}
                                title="Print Report"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(entry)}
                                title="Edit Entry"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    title="Delete Entry"
                                    disabled={deletingId === entry.id}
                                  >
                                    {deletingId === entry.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the entry for{' '}
                                      {format(parseISO(entry.date), 'dd MMM yyyy')}.
                                      Stock levels will be restored to tanks.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(entry.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete & Restore Stock
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Single Entry Print Preview Dialog */}
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Print Preview</span>
                <Button onClick={executePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </DialogTitle>
            </DialogHeader>
            {selectedEntry && <PrintableReport entry={selectedEntry} />}
          </DialogContent>
        </Dialog>

        {/* Download Report Date Range Dialog */}
        <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5" />
                Download Report
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Select a date range to generate a combined PDF report of all entries.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {dateFrom ? format(dateFrom, 'dd MMM yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {dateTo ? format(dateTo, 'dd MMM yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button onClick={handleDownloadReport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Generate & Print Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Print-only rendering target (same component, same CSS) */}
      <div className="print-only">
        {printEntry && <PrintableReport entry={printEntry} />}
        {printEntries.length > 0 && printEntries.map((entry) => (
          <div key={entry.id} className="print-page-break">
            <PrintableReport entry={entry} />
          </div>
        ))}
      </div>
    </>
  );
}
