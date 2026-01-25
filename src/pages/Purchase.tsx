import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePurchaseStore } from '@/store/purchase-store';
import { formatAmount, formatLiters } from '@/lib/format';
import { Plus, Truck, Package, History, Trash2, Eye, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PurchaseEntry } from '@/types/purchase';
import { InvoiceViewDialog } from '@/components/purchase/InvoiceViewDialog';
import { InvoiceEditDialog } from '@/components/purchase/InvoiceEditDialog';

export default function Purchase() {
  const navigate = useNavigate();
  const { tanks, purchases, initializeTanks, deletePurchase } = usePurchaseStore();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseEntry | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  useEffect(() => {
    initializeTanks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initializeTanks]);

  const recentPurchases = [...purchases]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const handleDeleteClick = (purchase: PurchaseEntry) => {
    setSelectedPurchase(purchase);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedPurchase) {
      deletePurchase(selectedPurchase.id);
      toast.success(`Invoice ${selectedPurchase.invoiceNumber} deleted`);
      setDeleteDialogOpen(false);
      setSelectedPurchase(null);
    }
  };

  const handleViewClick = (purchase: PurchaseEntry) => {
    setSelectedPurchase(purchase);
    setViewDialogOpen(true);
  };

  const handleEditClick = (purchase: PurchaseEntry) => {
    setSelectedPurchase(purchase);
    setEditDialogOpen(true);
  };

  const handleEditFromView = () => {
    setViewDialogOpen(false);
    setEditDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Management</h1>
          <p className="text-muted-foreground">Track fuel purchases and tanker unloading</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => navigate('/purchase/new')}
          className="h-12 px-6"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Tanker Unloading
        </Button>
      </div>

      {/* Tank Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tanks.map((tank) => (
          <Card key={tank.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-lg",
                  tank.fuelType === 'MS' && "bg-orange-500/10",
                  tank.fuelType === 'HSD' && "bg-blue-500/10",
                  tank.fuelType === 'POWER' && "bg-pink-500/10"
                )}>
                  <Package className={cn(
                    "w-6 h-6",
                    tank.fuelType === 'MS' && "text-orange-500",
                    tank.fuelType === 'HSD' && "text-blue-500",
                    tank.fuelType === 'POWER' && "text-pink-500"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{tank.name}</p>
                  <p className="text-sm text-muted-foreground">{tank.fuelType}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Current Stock</span>
                  <span className="font-bold">{formatLiters(tank.currentStock)} L</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all",
                      tank.fuelType === 'MS' && "bg-orange-500",
                      tank.fuelType === 'HSD' && "bg-blue-500",
                      tank.fuelType === 'POWER' && "bg-pink-500"
                    )}
                    style={{ width: `${Math.min(100, (tank.currentStock / tank.capacity) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  Capacity: {formatLiters(tank.capacity)} L
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {tanks.length === 0 && (
          <Card className="col-span-full border-2 border-dashed">
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium">No tanks configured</p>
              <p className="text-muted-foreground mb-4">
                Tanks will be automatically created when you start your first unloading
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Purchases */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPurchases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Chambers</TableHead>
                  <TableHead>Invoice Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {format(new Date(purchase.invoiceDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">{purchase.invoiceNumber}</TableCell>
                    <TableCell>{purchase.supplierName}</TableCell>
                    <TableCell>
                      {purchase.chambers.map(c => c.fuelType).join(', ')}
                    </TableCell>
                    <TableCell>₹{formatAmount(purchase.totalInvoiceValue)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        purchase.status === 'completed' 
                          ? "bg-green-500/20 text-green-600"
                          : "bg-amber-500/20 text-amber-600"
                      )}>
                        {purchase.status === 'completed' ? 'Completed' : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewClick(purchase)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(purchase)}
                          title="Edit Invoice"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(purchase)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No purchase records yet</p>
              <p className="text-muted-foreground mb-4">
                Start by creating your first tanker unloading entry
              </p>
              <Button onClick={() => navigate('/purchase/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Purchase
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice <strong>{selectedPurchase?.invoiceNumber}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced View Dialog */}
      <InvoiceViewDialog
        purchase={selectedPurchase}
        isOpen={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedPurchase(null);
        }}
        onEdit={handleEditFromView}
      />

      {/* Edit Invoice Dialog */}
      <InvoiceEditDialog
        purchase={selectedPurchase}
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedPurchase(null);
        }}
      />
    </div>
  );
}
