import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Package, AlertTriangle, CheckCircle, Trash2, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { FuelType, PurchaseInvoice } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

const fuelTypeColors: Record<FuelType, string> = {
  MS: 'bg-amber-500',
  HSD: 'bg-green-600',
  POWER: 'bg-blue-600',
};

const fuelTypeNames: Record<FuelType, string> = {
  MS: 'MS (Petrol)',
  HSD: 'HSD (Diesel)',
  POWER: 'POWER (Premium)',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function StockPurchases() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    supplier: '',
    fuelType: 'MS' as FuelType,
    tankId: '',
    quantityKL: 0,
    basicRate: 0,
    vatPercentage: 5,
    challanDensity: 0,
    challanTemperature: 0,
    measuredDensity: 0,
    measuredTemperature: 0,
  });

  const { toast } = useToast();
  const { purchases, tanks, tankStocks, addPurchase, deletePurchase } = usePetrolPumpStore();

  // Filter tanks by selected fuel type
  const compatibleTanks = tanks.filter((t) => t.fuelType === formData.fuelType);

  const densityDifference = Math.abs(formData.challanDensity - formData.measuredDensity);
  const isQualityAccepted = densityDifference <= 3.0;
  const vatAmount = (formData.quantityKL * 1000 * formData.basicRate * formData.vatPercentage) / 100;
  const totalAmount = (formData.quantityKL * 1000 * formData.basicRate) + vatAmount;

  const handleSubmit = () => {
    if (!formData.invoiceNumber || !formData.supplier || formData.quantityKL <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    addPurchase({
      invoiceNumber: formData.invoiceNumber,
      date: format(purchaseDate, 'yyyy-MM-dd'),
      supplier: formData.supplier,
      fuelType: formData.fuelType,
      tankId: formData.tankId || compatibleTanks[0]?.id,
      quantityKL: formData.quantityKL,
      basicRate: formData.basicRate,
      vatPercentage: formData.vatPercentage,
      challanDensity: formData.challanDensity,
      challanTemperature: formData.challanTemperature,
      measuredDensity: formData.measuredDensity,
      measuredTemperature: formData.measuredTemperature,
    });

    toast({
      title: 'Purchase Added',
      description: `Invoice ${formData.invoiceNumber} has been recorded.`,
    });

    setFormData({
      invoiceNumber: '',
      supplier: '',
      fuelType: 'MS',
      tankId: '',
      quantityKL: 0,
      basicRate: 0,
      vatPercentage: 5,
      challanDensity: 0,
      challanTemperature: 0,
      measuredDensity: 0,
      measuredTemperature: 0,
    });
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deletePurchase(id);
    toast({
      title: 'Purchase Deleted',
      description: 'The purchase record has been removed.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock & Purchases</h1>
          <p className="text-muted-foreground">
            Manage fuel purchases and TT unloading records
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Purchase Invoice</DialogTitle>
              <DialogDescription>
                Record a new fuel purchase with quality control checks
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="INV-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(purchaseDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={purchaseDate}
                        onSelect={(date) => date && setPurchaseDate(date)}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                  />
                </div>
              </div>

              {/* Fuel Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fuel Type</Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value) => setFormData({ ...formData, fuelType: value as FuelType, tankId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MS">MS (Petrol)</SelectItem>
                      <SelectItem value="HSD">HSD (Diesel)</SelectItem>
                      <SelectItem value="POWER">POWER (Premium)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destination Tank</Label>
                  <Select
                    value={formData.tankId}
                    onValueChange={(value) => setFormData({ ...formData, tankId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tank" />
                    </SelectTrigger>
                    <SelectContent>
                      {compatibleTanks.map((tank) => (
                        <SelectItem key={tank.id} value={tank.id}>
                          {tank.name} ({tank.currentStock.toLocaleString()} L)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Quantity (KL)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.quantityKL || ''}
                    onChange={(e) => setFormData({ ...formData, quantityKL: parseFloat(e.target.value) || 0 })}
                    placeholder="0.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Basic Rate (₹/L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.basicRate || ''}
                    onChange={(e) => setFormData({ ...formData, basicRate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAT %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.vatPercentage || ''}
                    onChange={(e) => setFormData({ ...formData, vatPercentage: parseFloat(e.target.value) || 0 })}
                    placeholder="5"
                  />
                </div>
              </div>

              {/* Amount Preview */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base Amount</span>
                  <span className="font-mono">{formatCurrency(formData.quantityKL * 1000 * formData.basicRate)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT ({formData.vatPercentage}%)</span>
                  <span className="font-mono">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Invoice Value</span>
                  <span className="font-mono">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Quality Control */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quality Control (TT Check)</CardTitle>
                  <CardDescription>Verify fuel quality before unloading</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Challan Details (From Bill)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Density</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.challanDensity || ''}
                            onChange={(e) => setFormData({ ...formData, challanDensity: parseFloat(e.target.value) || 0 })}
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Temperature °C</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.challanTemperature || ''}
                            onChange={(e) => setFormData({ ...formData, challanTemperature: parseFloat(e.target.value) || 0 })}
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Physical Verification (Measured)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Density</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.measuredDensity || ''}
                            onChange={(e) => setFormData({ ...formData, measuredDensity: parseFloat(e.target.value) || 0 })}
                            placeholder="0.0"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Temperature °C</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.measuredTemperature || ''}
                            onChange={(e) => setFormData({ ...formData, measuredTemperature: parseFloat(e.target.value) || 0 })}
                            placeholder="0.0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quality Status */}
                  {(formData.challanDensity > 0 || formData.measuredDensity > 0) && (
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-lg",
                      isQualityAccepted ? "bg-success/10" : "bg-destructive/10"
                    )}>
                      {isQualityAccepted ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      )}
                      <div>
                        <p className={cn(
                          "font-medium",
                          isQualityAccepted ? "text-success" : "text-destructive"
                        )}>
                          {isQualityAccepted ? 'ACCEPTED' : 'WARNING: DENSITY MISMATCH'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Density difference: {densityDifference.toFixed(1)} (Threshold: ≤ 3.0)
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Add Purchase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Stock Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        {tankStocks.map((tank) => {
          const percentage = (tank.currentStock / tank.capacity) * 100;
          return (
            <Card key={tank.fuelType}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("w-3 h-3 rounded-full", fuelTypeColors[tank.fuelType])} />
                  <CardTitle className="text-base">{fuelTypeNames[tank.fuelType]}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Stock</span>
                    <span className="font-mono font-semibold">{tank.currentStock.toLocaleString()} L</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", fuelTypeColors[tank.fuelType])}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{percentage.toFixed(1)}% full</span>
                    <span>Capacity: {tank.capacity.toLocaleString()} L</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>All recorded fuel purchases and TT unloading records</CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No purchases recorded yet</p>
              <p className="text-sm text-muted-foreground/70">Click "Add Purchase" to record your first TT unloading</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Invoice</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Fuel</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Quantity</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Quality</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((purchase) => (
                      <tr key={purchase.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 text-sm">
                          {format(new Date(purchase.date), 'dd MMM yyyy')}
                        </td>
                        <td className="py-3 px-2 text-sm font-medium">{purchase.invoiceNumber}</td>
                        <td className="py-3 px-2 text-sm">{purchase.supplier}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", fuelTypeColors[purchase.fuelType])} />
                            <span className="text-sm">{purchase.fuelType}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-mono">
                          {purchase.quantityKL.toFixed(3)} KL
                        </td>
                        <td className="py-3 px-2 text-sm text-right font-mono">
                          {formatCurrency(purchase.totalAmount)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge
                            variant={purchase.qualityStatus === 'accepted' ? 'default' : 'destructive'}
                            className={purchase.qualityStatus === 'accepted' ? 'bg-success' : ''}
                          >
                            {purchase.qualityStatus === 'accepted' ? 'Accepted' : 'Warning'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(purchase.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
