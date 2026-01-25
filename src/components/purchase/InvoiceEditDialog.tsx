import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PurchaseEntry } from '@/types/purchase';
import { usePurchaseStore } from '@/store/purchase-store';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface InvoiceEditDialogProps {
  purchase: PurchaseEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceEditDialog({ purchase, isOpen, onClose }: InvoiceEditDialogProps) {
  const { updatePurchase } = usePurchaseStore();
  
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [supplierPlace, setSupplierPlace] = useState('');
  const [totalInvoiceValue, setTotalInvoiceValue] = useState<number>(0);

  useEffect(() => {
    if (purchase && isOpen) {
      setInvoiceNumber(purchase.invoiceNumber);
      setInvoiceDate(purchase.invoiceDate);
      setSupplierPlace(purchase.supplierName);
      setTotalInvoiceValue(purchase.totalInvoiceValue);
    }
  }, [purchase, isOpen]);

  const handleSave = () => {
    if (!purchase) return;
    
    if (!invoiceNumber || !invoiceDate || !supplierPlace || totalInvoiceValue <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    updatePurchase(purchase.id, {
      invoiceNumber,
      invoiceDate,
      supplierName: supplierPlace,
      totalInvoiceValue,
    });

    toast.success('Invoice updated successfully');
    onClose();
  };

  if (!purchase) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Invoice Number *</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g., INV-2025-001"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Invoice Date *</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Supplier Place (Depot) *</Label>
            <Input
              value={supplierPlace}
              onChange={(e) => setSupplierPlace(e.target.value)}
              placeholder="e.g., Barauni"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Total Invoice Value (₹) *</Label>
            <Input
              type="number"
              value={totalInvoiceValue || ''}
              onChange={(e) => setTotalInvoiceValue(Number(e.target.value))}
              placeholder="Enter total amount"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
