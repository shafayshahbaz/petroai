import { AlertTriangle, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export function SubscriptionBanner() {
  const { isSubscriptionActive, subscriptionExpiryDate, role } = useAuth();

  // Super admins don't need subscription
  if (role === 'super_admin' || isSubscriptionActive) {
    return null;
  }

  // Check if it's a suspension vs expiry
  const isExpired = subscriptionExpiryDate && new Date(subscriptionExpiryDate) < new Date();

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium">
      {isExpired ? (
        <>
          <AlertTriangle className="w-4 h-4" />
          <span>
            Subscription Expired
            {subscriptionExpiryDate && ` on ${format(subscriptionExpiryDate, 'dd MMM yyyy')}`}.
            Contact Admin to Renew. <strong>(View Only Mode - All editing disabled)</strong>
          </span>
        </>
      ) : (
        <>
          <Ban className="w-4 h-4" />
          <span>
            <strong>Account Suspended.</strong> Please contact admin to resume operations. 
            <strong> (View Only Mode - All editing disabled)</strong>
          </span>
        </>
      )}
    </div>
  );
}
