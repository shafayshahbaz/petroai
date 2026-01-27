import { useState } from 'react';
import { Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PasswordConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  variant?: 'default' | 'destructive';
}

export function PasswordConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  variant = 'default',
}: PasswordConfirmationModalProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Get current user's email
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.email) {
        throw new Error('User not found');
      }

      // Re-authenticate with password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password: password,
      });

      if (signInError) {
        setError('Incorrect password. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Password verified - execute the action
      await onConfirm();
      
      // Reset and close
      setPassword('');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Verification error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to verify password',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={variant === 'destructive' ? 'flex items-center gap-2 text-destructive' : ''}>
            {variant === 'destructive' && <AlertTriangle className="w-5 h-5" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              <Lock className="w-4 h-4 inline mr-2" />
              Enter your password to confirm this action
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Your Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your current password"
                className={error ? 'border-destructive pr-10' : 'pr-10'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isVerifying}>
            Cancel
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isVerifying || !password}
          >
            {isVerifying ? 'Verifying...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
