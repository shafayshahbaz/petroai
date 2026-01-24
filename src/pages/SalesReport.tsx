import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { 
  Edit, 
  Trash2, 
  Printer, 
  Search, 
  Calendar
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
import { DailyEntry } from '@/types/petrol-pump';
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
                body { font-family: 'Courier New', monospace; margin: 20px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #000; padding: 4px 8px; text-align: right; }
                th { background: #f0f0f0; }
                .text-left { text-align: left; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .section-title { font-weight: bold; text-decoration: underline; text-align: center; margin: 15px 0 5px; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 18px; }
                .header p { margin: 5px 0; }
                .two-column { display: flex; gap: 20px; }
                .column { flex: 1; }
                .summary-row { display: flex; justify-content: space-between; padding: 2px 0; }
                .total-row { border-top: 2px solid #000; font-weight: bold; margin-top: 5px; padding-top: 5px; }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
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
                    <TableHead className="text-right">Outflows</TableHead>
                    <TableHead className="text-right">Closing Cash</TableHead>
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
                          {entry.isMultiDay && entry.endDate && (
                            <span className="text-muted-foreground ml-1">
                              - {format(parseISO(entry.endDate), 'dd MMM')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{entry.shiftName || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(totals.totalFuelAmount + totals.totalLubeAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-destructive">
                          {formatCurrency(totals.totalOutflow)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-success">
                          {formatCurrency(totals.closingCash)}
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
