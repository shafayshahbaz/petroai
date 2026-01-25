import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'pump_owner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isSubscriptionActive: boolean;
  subscriptionExpiryDate: Date | null;
  clientId: string | null;
  isFirstLogin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(true);
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState<Date | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const fetchUserRole = async (userId: string) => {
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
  };

  const fetchClientData = async (userId: string) => {
    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id, subscription_status, subscription_expiry_date, is_first_login')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (clientData) {
        setClientId(clientData.id);
        setIsFirstLogin(clientData.is_first_login);
        
        const expiryDate = new Date(clientData.subscription_expiry_date);
        setSubscriptionExpiryDate(expiryDate);
        
        const isActive = clientData.subscription_status === 'active' && expiryDate > new Date();
        setIsSubscriptionActive(isActive);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    }
  };

  const refreshSubscriptionStatus = async () => {
    if (user) {
      await fetchClientData(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
            fetchClientData(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setClientId(null);
          setIsFirstLogin(false);
          setIsSubscriptionActive(true);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(setRole);
        fetchClientData(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setClientId(null);
    setIsFirstLogin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        isSubscriptionActive,
        subscriptionExpiryDate,
        clientId,
        isFirstLogin,
        signIn,
        signOut,
        refreshSubscriptionStatus,
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
