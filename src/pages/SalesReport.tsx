import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  Edit, 
  Trash2, 
  Printer, 
  Search, 
  Calendar,
  ChevronDown,
  Eye
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
import { usePetrolPumpStore, calculateTotals } from '@/store/petrol-pump-store';
import { useCloudData, CloudDailyEntry } from '@/contexts/CloudDataContext';
import { useToast } from '@/hooks/use-toast';
import { DailyEntry, FuelType } from '@/types/petrol-pump';
import { PrintableReport } from '@/components/report/PrintableReport';

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
  
  const { loadEntryForEdit } = usePetrolPumpStore();
  const { dailyEntries: cloudEntries, deleteDailyEntry, isOnline } = useCloudData();

  // Convert cloud entries to local format for display
  const entries = useMemo(() => 
    cloudEntries.map(cloudToLocalEntry),
    [cloudEntries]
  );

  useEffect(() => {
    const onAfterPrint = () => setPrintEntry(null);
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
    loadEntryForEdit(entry.id);
    navigate('/daily-entry');
  };

  const handleDelete = async (id: string) => {
    if (!isOnline) {
      toast({
        title: 'Offline',
        description: 'Cannot delete while offline',
        variant: 'destructive',
      });
      return;
    }
    await deleteDailyEntry(id);
    toast({
      title: 'Entry Deleted',
      description: 'The daily entry has been deleted from the cloud.',
    });
  };

  const handlePrint = (entry: DailyEntry) => {
    setSelectedEntry(entry);
  };

  const executePrint = () => {
    if (!selectedEntry) return;

    // Print from the SAME document so the print output uses the exact
    // same Tailwind/CSS as the on-screen preview (no new-window CSS drift).
    setPrintEntry(selectedEntry);
    setSelectedEntry(null);

    // Allow React to render the print-only content before printing.
    requestAnimationFrame(() => {
      setTimeout(() => window.print(), 50);
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
          <Button onClick={() => navigate('/daily-entry')}>
            + New Entry
          </Button>
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
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the entry for{' '}
                                      {format(parseISO(entry.date), 'dd MMM yyyy')}.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(entry.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
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

        {/* Print Preview Dialog */}
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
      </div>

      {/* Print-only rendering target (same component, same CSS) */}
      <div className="print-only">
        {printEntry && <PrintableReport entry={printEntry} />}
      </div>
    </>
  );
}
