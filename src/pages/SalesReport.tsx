import { useState, useMemo, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { DailyEntry, DEFAULT_NOZZLE_CONFIG, FuelType } from '@/types/petrol-pump';
import { PrintableReport } from '@/components/report/PrintableReport';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SalesReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const { entries, deleteEntry, loadEntryForEdit } = usePetrolPumpStore();

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

  const handleDelete = (id: string) => {
    deleteEntry(id);
    toast({
      title: 'Entry Deleted',
      description: 'The daily entry has been deleted.',
    });
  };

  const handlePrint = (entry: DailyEntry) => {
    setSelectedEntry(entry);
  };

  const executePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Daily Sales Report - ${selectedEntry?.date}</title>
              <style>
                @page { size: A4; margin: 0.5in; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { font-family: 'Courier New', monospace; margin: 20px; font-size: 12px; line-height: 1.4; }
                
                /* Tables */
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { padding: 4px 8px; text-align: right; }
                th { font-weight: bold; }
                
                /* Text utilities */
                .text-left { text-align: left; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .font-mono { font-family: 'Courier New', monospace; }
                
                /* Layout */
                .daily-report-sheet { padding: 20px; }
                .space-y-1 > * + * { margin-top: 4px; }
                .space-y-6 > * + * { margin-top: 24px; }
                .mb-3, .mb-4, .mb-6, .mb-8 { margin-bottom: 16px; }
                .mt-2, .mt-3, .mt-6 { margin-top: 12px; }
                .pt-2, .pt-4 { padding-top: 8px; }
                .pb-1, .pb-4 { padding-bottom: 4px; }
                .pr-4 { padding-right: 16px; }
                .pl-4 { padding-left: 16px; }
                .p-2 { padding: 8px; }
                
                /* Borders */
                .border-t { border-top: 1px solid #000; }
                .border-b { border-bottom: 1px solid #000; }
                .border-r { border-right: 1px solid #000; }
                .border-t-2, .border-b-2 { border-top: 2px solid #000; border-bottom: 2px solid #000; }
                .border-black { border-color: #000; }
                
                /* T-FORMAT Grid - CRITICAL */
                .t-format-container {
                  display: grid !important;
                  grid-template-columns: 1fr 1fr !important;
                  gap: 24px !important;
                  page-break-inside: avoid;
                }
                .inflow-column { border-right: 1px solid #000; padding-right: 16px; }
                .outflow-column { padding-left: 16px; }
                
                /* Flex utilities */
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .justify-end { justify-content: flex-end; }
                .gap-4 { gap: 16px; }
                
                /* Background */
                .bg-gray-200 { background: #e5e5e5; }
                
                /* Text sizes */
                .text-lg { font-size: 16px; }
                .text-2xl { font-size: 24px; }
                .text-base { font-size: 14px; }
                .text-sm { font-size: 12px; }
                
                /* Tracking */
                .tracking-wide { letter-spacing: 0.05em; }
                
                /* Colors for print */
                .text-amber-800 { color: #92400e; }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 250);
      }
    }
    setSelectedEntry(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
              <Table>
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
          {selectedEntry && (
            <div ref={printRef}>
              <PrintableReport entry={selectedEntry} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
