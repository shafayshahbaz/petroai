import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSettingsStore } from '@/store/settings-store';

type AppRole = 'super_admin' | 'pump_owner';

// Business profile data from clients table
interface ClientProfile {
  pumpName: string;
  ownerName: string;
  address: string | null;
  gstNumber: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isProfileLoaded: boolean; // New: indicates if profile data is fully loaded
  isSubscriptionActive: boolean;
  subscriptionExpiryDate: Date | null;
  clientId: string | null;
  clientProfile: ClientProfile | null; // New: business profile from cloud
  isFirstLogin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  refreshClientProfile: () => Promise<void>; // New: force refresh profile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(true);
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState<Date | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const updateBusinessProfile = useSettingsStore((state) => state.updateBusinessProfile);
  const setAccountCreatedAt = useSettingsStore((state) => state.setAccountCreatedAt);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return roleData?.role as AppRole | null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }, []);

  const fetchClientData = useCallback(async (userId: string) => {
    try {
      console.log('Fetching client data for user:', userId);
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id, pump_name, owner_name, address, gst_number, phone, subscription_status, subscription_expiry_date, is_first_login, created_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (clientData) {
        console.log('Client data loaded:', clientData.pump_name);
        setClientId(clientData.id);
        setIsFirstLogin(clientData.is_first_login);
        
        const expiryDate = new Date(clientData.subscription_expiry_date);
        setSubscriptionExpiryDate(expiryDate);
        
        const isActive = clientData.subscription_status === 'active' && expiryDate > new Date();
        setIsSubscriptionActive(isActive);

        // Set client profile from cloud
        const profile: ClientProfile = {
          pumpName: clientData.pump_name,
          ownerName: clientData.owner_name,
          address: clientData.address,
          gstNumber: clientData.gst_number,
          phone: clientData.phone,
        };
        setClientProfile(profile);

        // Sync with settings store for components that use it
        updateBusinessProfile({
          companyName: clientData.pump_name,
          customerId: clientData.id.slice(0, 8).toUpperCase(),
          address: clientData.address || '',
          gstNumber: clientData.gst_number || '',
          phone: clientData.phone || '',
        });
        
        if (clientData.created_at) {
          setAccountCreatedAt(clientData.created_at);
        }

        setIsProfileLoaded(true);
        return clientData;
      } else {
        // No client record - might be super admin
        setIsProfileLoaded(true);
        return null;
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      setIsProfileLoaded(true); // Mark as loaded even on error to prevent infinite loading
      return null;
    }
  }, [updateBusinessProfile, setAccountCreatedAt]);

  const refreshSubscriptionStatus = useCallback(async () => {
    if (user) {
      await fetchClientData(user.id);
    }
  }, [user, fetchClientData]);

  const refreshClientProfile = useCallback(async () => {
    if (user) {
      await fetchClientData(user.id);
    }
  }, [user, fetchClientData]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer Supabase calls to prevent deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
            fetchClientData(session.user.id);
          }, 0);
        } else {
          // Reset all state on logout
          setRole(null);
          setClientId(null);
          setClientProfile(null);
          setIsFirstLogin(false);
          setIsSubscriptionActive(true);
          setIsProfileLoaded(false);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Restored session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch role and client data immediately on session restore
        Promise.all([
          fetchUserRole(session.user.id).then(setRole),
          fetchClientData(session.user.id)
        ]).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
        setIsProfileLoaded(true); // No user = no profile to load
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole, fetchClientData]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Clear settings store first
    useSettingsStore.getState().clearAllData();
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setClientId(null);
    setClientProfile(null);
    setIsFirstLogin(false);
    setIsProfileLoaded(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        isProfileLoaded,
        isSubscriptionActive,
        subscriptionExpiryDate,
        clientId,
        clientProfile,
        isFirstLogin,
        signIn,
        signInWithGoogle,
        signOut,
        refreshSubscriptionStatus,
        refreshClientProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
