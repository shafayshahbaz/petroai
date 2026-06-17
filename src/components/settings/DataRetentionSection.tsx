import { useEffect, useState } from 'react';
import { Archive, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  RETENTION_DAYS,
  previewRetentionRollover,
  runRetentionRollover,
  getLastRetentionRun,
  type RetentionPreview,
} from '@/services/dataRetentionService';
import { formatRupees } from '@/lib/format';
import { format } from 'date-fns';

export function DataRetentionSection() {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [preview, setPreview] = useState<RetentionPreview | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const loadPreview = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [p, lr] = await Promise.all([previewRetentionRollover(clientId), getLastRetentionRun(clientId)]);
      setPreview(p);
      setLastRun(lr);
    } catch (e: any) {
      toast({ title: 'Could not load preview', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleRun = async () => {
    if (!clientId) return;
    setRunning(true);
    try {
      const result = await runRetentionRollover(clientId);
      toast({
        title: 'Cleanup complete',
        description: `Archived ${result.entriesToDelete} entries. Opening cash rolled to ${formatRupees(result.newOpeningCash)}.`,
      });
      await loadPreview();
    } catch (e: any) {
      toast({ title: 'Cleanup failed', description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const nothingToDo =
    preview &&
    preview.entriesToDelete === 0 &&
    preview.reportsToDelete === 0 &&
    preview.bankMovementsToDelete === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Archive className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>Data Retention ({RETENTION_DAYS} days)</CardTitle>
            <CardDescription>
              Keeps only the last {RETENTION_DAYS} days of entries. Cash, stock, and meter readings are
              carried forward automatically before deletion — nothing is lost.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastRun && (
          <p className="text-xs text-muted-foreground">
            Last cleanup: {format(new Date(lastRun), 'dd MMM yyyy, hh:mm a')}
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking…
          </div>
        ) : preview ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Person entries" value={preview.entriesToDelete} />
            <Stat label="Sales reports" value={preview.reportsToDelete} />
            <Stat label="Bank movements" value={preview.bankMovementsToDelete} />
            <Stat label="Nozzle rolls" value={preview.nozzleReadingsToRoll.length} />
            <div className="col-span-2 md:col-span-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current opening cash</span>
                <span className="font-medium">{formatRupees(preview.currentOpeningCash)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">→ New opening cash after rollover</span>
                <span className="font-semibold text-primary">{formatRupees(preview.newOpeningCash)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cutoff date: deletes everything before <strong>{preview.cutoffDate}</strong>
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadPreview} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={running || loading || nothingToDo}>
                {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                Run cleanup now
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Archive data older than {RETENTION_DAYS} days?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>
                      Opening cash will be updated to{' '}
                      <strong>{preview && formatRupees(preview.newOpeningCash)}</strong>. Each nozzle's
                      opening reading will be rolled to its latest closing. Stock on tanks is unaffected.
                    </p>
                    <p>This permanently deletes {preview?.entriesToDelete} entries, {preview?.reportsToDelete} reports, and {preview?.bankMovementsToDelete} bank movements. The dashboard, debtors, purchases and stock will continue to look correct.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRun}>Yes, archive & roll forward</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
