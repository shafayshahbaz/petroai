import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  listNozzleMen,
  addNozzleMan,
  deactivateNozzleMan,
  NozzleMan,
} from '@/services/staffService';

export function StaffSection() {
  const { toast } = useToast();
  const { clientId } = useAuth();
  const [staff, setStaff] = useState<NozzleMan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setStaff(await listNozzleMen());
    } catch (e: any) {
      toast({ title: 'Failed to load staff', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) load();
  }, [clientId]);

  const handleAdd = async () => {
    if (!clientId || !newName.trim()) return;
    setSaving(true);
    try {
      await addNozzleMan(newName, clientId);
      setNewName('');
      setOpen(false);
      await load();
      toast({ title: 'Staff added' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deactivateNozzleMan(id);
      await load();
      toast({ title: 'Removed' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Staff / Nozzle Men</CardTitle>
              <CardDescription>
                Manage the list of nozzle men used in Person Entry
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No nozzle men yet. Add your first one to use in Person Entry.
          </p>
        ) : (
          <div className="divide-y border rounded-lg">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3">
                <span className="font-medium">{s.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(s.id)}
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Nozzle Man</DialogTitle>
            <DialogDescription>Enter the name of the new nozzle man</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
