import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

type PaymentMode = 'cash' | 'bank' | 'upi';

interface PaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtorName: string;
  onSubmit: (data: {
    date: string;
    amount: number;
    paymentMode: PaymentMode;
    remarks: string;
  }) => void;
}

export function PaymentReceiptModal({
  open,
  onOpenChange,
  debtorName,
  onSubmit,
}: PaymentReceiptModalProps) {
  const { t } = useLanguage();
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    onSubmit({
      date: date.toISOString().split('T')[0],
      amount: parseFloat(amount),
      paymentMode,
      remarks,
    });

    // Reset form
    setAmount('');
    setPaymentMode('cash');
    setRemarks('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Receipt / Payment Received</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Recording payment from: <span className="font-medium text-foreground">{debtorName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>{t('date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd-MM-yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>{t('amount')} (₹)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          {/* Payment Mode */}
          <div className="space-y-2">
            <Label>Payment Mode</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as PaymentMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea
              placeholder="Receipt number, cheque details, etc."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!amount || parseFloat(amount) <= 0}>
            {t('save')} Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
