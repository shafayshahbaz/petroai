import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PurchaseEntry } from '@/types/purchase';
import { formatAmount, formatLiters } from '@/lib/format';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Calendar, 
  MapPin, 
  Banknote, 
  Truck, 
  Droplets, 
  Thermometer, 
  CheckCircle2, 
  XCircle,
  Package
} from 'lucide-react';

interface InvoiceViewDialogProps {
  purchase: PurchaseEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

const getFuelColor = (fuelType: string) => {
  switch (fuelType) {
    case 'MS':
      return { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' };
    case 'HSD':
      return { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' };
    case 'POWER':
      return { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/30' };
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' };
  }
};

export function InvoiceViewDialog({ purchase, isOpen, onClose, onEdit }: InvoiceViewDialogProps) {
  if (!purchase) return null;

  const totalChamberCapacity = purchase.chambers.reduce((sum, c) => sum + c.capacity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6" />
            Invoice Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <FileText className="w-3 h-3" />
                Invoice No.
              </div>
              <p className="font-bold text-lg">{purchase.invoiceNumber}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Calendar className="w-3 h-3" />
                Date
              </div>
              <p className="font-bold text-lg">{format(new Date(purchase.invoiceDate), 'dd MMM yyyy')}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <MapPin className="w-3 h-3" />
                Depot
              </div>
              <p className="font-bold text-lg">{purchase.supplierName}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Banknote className="w-3 h-3" />
                Invoice Value
              </div>
              <p className="font-bold text-lg text-primary">₹{formatAmount(purchase.totalInvoiceValue)}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-4">
            <Badge 
              variant={purchase.status === 'completed' ? 'default' : 'outline'}
              className={cn(
                "px-4 py-1",
                purchase.status === 'completed' 
                  ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" 
                  : "bg-amber-500/20 text-amber-600"
              )}
            >
              {purchase.status === 'completed' ? 'Completed' : 'Draft'}
            </Badge>
            
            {purchase.densityCheck.status === 'OK' ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Quality Passed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Quality Failed</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Chambers Section */}
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5" />
              Truck Chambers ({purchase.chambers.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {purchase.chambers.map((chamber, idx) => {
                const colors = getFuelColor(chamber.fuelType);
                const dipDiff = chamber.physicalDip - chamber.challanDip;
                const isWithinTolerance = Math.abs(dipDiff) <= 3;
                
                return (
                  <div 
                    key={chamber.id}
                    className={cn(
                      "border-2 rounded-lg p-3",
                      colors.bg,
                      colors.border
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("font-bold", colors.text)}>C{idx + 1}</span>
                      <Badge variant="outline" className={cn("text-xs", colors.text)}>
                        {chamber.fuelType}
                      </Badge>
                    </div>
                    <p className="text-lg font-bold">{formatLiters(chamber.capacity)} L</p>
                    <div className="mt-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Challan Dip:</span>
                        <span className="font-medium">{chamber.challanDip} cm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Physical Dip:</span>
                        <span className="font-medium">{chamber.physicalDip} cm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diff:</span>
                        <span className={cn(
                          "font-bold",
                          isWithinTolerance ? "text-green-600" : "text-destructive"
                        )}>
                          {dipDiff > 0 ? '+' : ''}{dipDiff.toFixed(1)} cm
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Total Capacity: <span className="font-bold text-foreground">{formatLiters(totalChamberCapacity)} L</span>
            </div>
          </div>

          <Separator />

          {/* Density Check */}
          {purchase.densityCheck.correctedDensity > 0 && (
            <>
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <Droplets className="w-5 h-5" />
                  Density Check
                </h3>
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                      <Droplets className="w-3 h-3" />
                      Physical Density
                    </div>
                    <p className="text-xl font-bold">{purchase.densityCheck.physicalDensity}</p>
                    <p className="text-xs text-muted-foreground">kg/m³</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                      <Thermometer className="w-3 h-3" />
                      Temperature
                    </div>
                    <p className="text-xl font-bold">{purchase.densityCheck.physicalTemp}</p>
                    <p className="text-xs text-muted-foreground">°C</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Corrected @15°C
                    </div>
                    <p className="text-xl font-bold text-primary">{purchase.densityCheck.correctedDensity.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">kg/m³</p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Stock Verifications */}
          {purchase.stockVerifications && purchase.stockVerifications.length > 0 && (
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Package className="w-5 h-5" />
                Tank Stock Verification
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tank</TableHead>
                    <TableHead className="text-right">Pre-Unload</TableHead>
                    <TableHead className="text-right">Post-Unload</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Invoice Qty</TableHead>
                    <TableHead className="text-right">Diff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.stockVerifications.map((v) => (
                    <TableRow key={v.tankId}>
                      <TableCell className="font-medium">{v.tankName}</TableCell>
                      <TableCell className="text-right">{formatLiters(v.preUnloadStock)} L</TableCell>
                      <TableCell className="text-right">{formatLiters(v.postUnloadStock)} L</TableCell>
                      <TableCell className="text-right font-medium">{formatLiters(v.receivedQty)} L</TableCell>
                      <TableCell className="text-right">{formatLiters(v.invoiceQty)} L</TableCell>
                      <TableCell className={cn(
                        "text-right font-bold",
                        v.difference >= 0 ? "text-green-600" : "text-destructive"
                      )}>
                        {v.difference > 0 ? '+' : ''}{formatLiters(v.difference)} L
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              Edit Invoice
            </Button>
          )}
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
