import { useState } from 'react';
import { Plus, Phone, Edit2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatAmount } from '@/lib/format';

export default function Debtors() {
  const { debtors, addDebtor, updateDebtor, deleteDebtor } = usePetrolPumpStore();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    openingBalance: '',
  });

  const handleOpenDialog = (debtor?: typeof debtors[0]) => {
    if (debtor) {
      setEditingId(debtor.id);
      setFormData({
        name: debtor.name,
        contactNumber: debtor.contactNumber || '',
        openingBalance: debtor.openingBalance?.toString() || '0',
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', contactNumber: '', openingBalance: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debtor name is required.',
      });
      return;
    }

    const openingBal = parseFloat(formData.openingBalance) || 0;

    if (editingId) {
      // Get current debtor to calculate outstanding difference
      const currentDebtor = debtors.find(d => d.id === editingId);
      const oldOpeningBalance = currentDebtor?.openingBalance || 0;
      const outstandingDiff = openingBal - oldOpeningBalance;
      
      updateDebtor(editingId, {
        name: formData.name.trim(),
        contactNumber: formData.contactNumber.trim() || undefined,
        openingBalance: openingBal,
        totalOutstanding: (currentDebtor?.totalOutstanding || 0) + outstandingDiff,
      });
      toast({
        title: 'Debtor Updated',
        description: `${formData.name} has been updated.`,
      });
    } else {
      addDebtor(formData.name.trim(), formData.contactNumber.trim() || undefined, openingBal);
      toast({
        title: 'Debtor Added',
        description: `${formData.name} has been added with opening balance of ${formatCurrency(openingBal)}.`,
      });
    }

    setIsDialogOpen(false);
    setFormData({ name: '', contactNumber: '', openingBalance: '' });
    setEditingId(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      const debtor = debtors.find(d => d.id === deleteId);
      deleteDebtor(deleteId);
      toast({
        title: 'Debtor Deleted',
        description: `${debtor?.name} has been deleted.`,
      });
      setDeleteId(null);
    }
  };

  const totalOutstanding = debtors.reduce((sum, d) => sum + d.totalOutstanding, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debtors Management</h1>
          <p className="text-muted-foreground">Manage credit customers and their outstanding balances</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Debtor
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Debtors</p>
              <p className="text-2xl font-bold">{debtors.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debtors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Debtor List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Total Outstanding</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debtors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No debtors found. Click "Add New Debtor" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                debtors.map((debtor) => (
                  <TableRow key={debtor.id}>
                    <TableCell className="font-medium">{debtor.name}</TableCell>
                    <TableCell>
                      {debtor.contactNumber ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {debtor.contactNumber}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(debtor.openingBalance || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-destructive">
                      {formatAmount(debtor.totalOutstanding)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(debtor)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(debtor.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Debtor' : 'Add New Debtor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter debtor name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                placeholder="Enter phone number"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opening">Opening Balance (Old Dues)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="opening"
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {editingId 
                  ? 'Update opening balance - this will adjust the total outstanding accordingly.'
                  : 'Enter any existing dues from before using this software.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {editingId ? 'Update' : 'Add Debtor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debtor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All transaction history for this debtor will remain in the ledger but the debtor profile will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
