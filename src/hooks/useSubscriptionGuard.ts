import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to check if actions should be disabled due to expired subscription
 * Returns helper functions to wrap action handlers with subscription checks
 */
export function useSubscriptionGuard() {
  const { isSubscriptionActive, role } = useAuth();
  const { toast } = useToast();

  // Super admins bypass subscription checks
  const canPerformActions = role === 'super_admin' || isSubscriptionActive;

  const guardAction = <T extends (...args: any[]) => any>(action: T): T => {
    return ((...args: Parameters<T>) => {
      if (!canPerformActions) {
        toast({
          title: 'Subscription Expired',
          description: 'Your subscription has expired. Contact admin to renew.',
          variant: 'destructive',
        });
        return;
      }
      return action(...args);
    }) as T;
  };

  return {
    canPerformActions,
    guardAction,
    isViewOnly: !canPerformActions,
  };
}
