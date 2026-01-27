import { useState } from 'react';
import { Trash2, AlertTriangle, UserX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  user_id: string;
  pump_name: string;
  owner_name: string;
}

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onDeleted: () => void;
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  client,
  onDeleted,
}: DeleteClientDialogProps) {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const expectedConfirmText = 'DELETE PERMANENTLY';

  const handleDelete = async () => {
    if (!client || confirmText !== expectedConfirmText) return;

    setIsDeleting(true);

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the edge function to permanently delete the client
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-client-permanently`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: client.user_id,
          clientId: client.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete client');
      }

      toast({
        title: 'Account Deleted Permanently',
        description: `${client.pump_name} (${client.owner_name}) has been completely removed from the system.`,
      });

      setConfirmText('');
      onOpenChange(false);
      onDeleted();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete client permanently',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Permanent Account Deletion
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to permanently delete:
              </p>
              {client && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="font-semibold text-foreground">{client.pump_name}</p>
                  <p className="text-sm">{client.owner_name}</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted border">
                <p className="text-sm font-medium text-foreground mb-2">This action will:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Delete the user from Authentication</li>
                  <li>Remove all associated data permanently</li>
                  <li>User will see "Invalid login credentials" if they try to sign in</li>
                </ul>
              </div>
              <p className="text-destructive font-medium">
                This action is IRREVERSIBLE and cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="confirm-delete" className="text-sm font-medium">
            Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{expectedConfirmText}</span> to confirm:
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedConfirmText}
            className="mt-2"
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== expectedConfirmText}
          >
            {isDeleting ? (
              'Deleting...'
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
