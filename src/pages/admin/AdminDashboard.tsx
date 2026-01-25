import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Plus, RefreshCw, LogOut, Search,
  Calendar, Phone, CheckCircle2, XCircle, Clock,
  Key, AlertTriangle, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  user_id: string;
  pump_name: string;
  owner_name: string;
  phone: string | null;
  subscription_status: 'active' | 'expired' | 'suspended';
  subscription_expiry_date: string;
  temp_password_hint: string | null;
  is_first_login: boolean;
  created_at: string;
  profiles?: {
    email: string;
  };
}

export default function AdminDashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showResetClientPasswordDialog, setShowResetClientPasswordDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  
  // Create client form
  const [newClient, setNewClient] = useState({
    email: '',
    password: '',
    pumpName: '',
    ownerName: '',
    phone: '',
  });

  useEffect(() => {
    if (role !== 'super_admin') {
      navigate('/admin');
      return;
    }
    fetchClients();
  }, [role, navigate]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email');

      if (profilesError) throw profilesError;

      const mergedData = (clientsData || []).map(client => ({
        ...client,
        profiles: profilesData?.find(p => p.user_id === client.user_id) || null,
      }));

      setClients(mergedData as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch clients',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createClient = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newClient.email,
        password: newClient.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: newClient.ownerName,
            role: 'pump_owner',
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const { error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: authData.user.id,
          pump_name: newClient.pumpName,
          owner_name: newClient.ownerName,
          phone: newClient.phone || null,
          temp_password_hint: `Generated: ${newClient.password.slice(-4)}****`,
        });

      if (clientError) throw clientError;

      toast({
        title: 'Client Created',
        description: `${newClient.pumpName} has been created successfully.`,
      });

      setShowCreateDialog(false);
      setNewClient({ email: '', password: '', pumpName: '', ownerName: '', phone: '' });
      fetchClients();
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
        variant: 'destructive',
      });
    }
  };

  const extendSubscription = async () => {
    if (!selectedClient) return;
    
    try {
      const currentExpiry = new Date(selectedClient.subscription_expiry_date);
      const newExpiry = addDays(currentExpiry > new Date() ? currentExpiry : new Date(), extendDays);

      const { error } = await supabase
        .from('clients')
        .update({
          subscription_expiry_date: newExpiry.toISOString(),
          subscription_status: 'active',
        })
        .eq('id', selectedClient.id);

      if (error) throw error;

      toast({
        title: 'Subscription Extended',
        description: `Extended by ${extendDays} days. New expiry: ${format(newExpiry, 'dd MMM yyyy')}`,
      });

      setShowExtendDialog(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to extend subscription',
        variant: 'destructive',
      });
    }
  };

  const toggleStatus = async (client: Client, newStatus: 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ subscription_status: newStatus })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `${client.pump_name} is now ${newStatus}`,
      });

      fetchClients();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const changeAdminPassword = async () => {
    if (!newAdminPassword || newAdminPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newAdminPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password Updated',
        description: 'Your admin password has been changed successfully.',
      });

      setShowPasswordDialog(false);
      setNewAdminPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    }
  };

  const resetClientPassword = async () => {
    if (!selectedClient || !newClientPassword || newClientPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-client-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          userId: selectedClient.user_id,
          newPassword: newClientPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      await supabase
        .from('clients')
        .update({ temp_password_hint: `Reset: ${newClientPassword.slice(-4)}****` })
        .eq('id', selectedClient.id);

      toast({
        title: 'Password Reset',
        description: `Password for ${selectedClient.pump_name} has been reset.`,
      });

      setShowResetClientPasswordDialog(false);
      setNewClientPassword('');
      setSelectedClient(null);
      fetchClients();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset client password',
        variant: 'destructive',
      });
    }
  };

  const getClientStatus = (client: Client) => {
    const isExpired = new Date(client.subscription_expiry_date) < new Date();
    if (isExpired || client.subscription_status === 'expired') return 'expired';
    if (client.subscription_status === 'suspended') return 'suspended';
    return 'active';
  };

  const filteredClients = clients.filter(client =>
    client.pump_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: clients.length,
    active: clients.filter(c => getClientStatus(c) === 'active').length,
    expired: clients.filter(c => getClientStatus(c) === 'expired').length,
    suspended: clients.filter(c => getClientStatus(c) === 'suspended').length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Master Admin</h1>
              <p className="text-sm text-muted-foreground">Client Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Admin Password</DialogTitle>
                  <DialogDescription>
                    Enter a new password for your admin account
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={changeAdminPassword}>
                    Update Password
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => signOut().then(() => navigate('/admin'))}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.suspended}</p>
                  <p className="text-sm text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchClients}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Client</DialogTitle>
                  <DialogDescription>
                    Add a new petrol pump client to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pump Name *</Label>
                      <Input
                        placeholder="Enter pump name"
                        value={newClient.pumpName}
                        onChange={(e) => setNewClient({ ...newClient, pumpName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Owner Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={newClient.ownerName}
                        onChange={(e) => setNewClient({ ...newClient, ownerName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Login ID) *</Label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temporary Password *</Label>
                    <Input
                      type="text"
                      placeholder="TempPass123"
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Client should change this on first login</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (Optional)</Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createClient}>
                    Create Client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Client Cards Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Client Directory</h2>
          
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Clients Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try a different search term' : 'Create your first client to get started'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredClients.map((client) => {
                const status = getClientStatus(client);
                return (
                  <Card key={client.id} className={cn(
                    "relative overflow-hidden transition-shadow hover:shadow-md",
                    status === 'expired' && "border-destructive/50",
                    status === 'suspended' && "border-amber-500/50"
                  )}>
                    {/* Status Indicator */}
                    <div className={cn(
                      "absolute top-0 left-0 right-0 h-1",
                      status === 'active' && "bg-emerald-500",
                      status === 'expired' && "bg-destructive",
                      status === 'suspended' && "bg-amber-500"
                    )} />
                    
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{client.pump_name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <span>{client.owner_name}</span>
                          </CardDescription>
                        </div>
                        <Badge variant={
                          status === 'active' ? 'default' :
                          status === 'expired' ? 'destructive' : 'secondary'
                        } className={cn(
                          status === 'active' && "bg-emerald-500",
                          status === 'suspended' && "bg-amber-500 text-amber-950"
                        )}>
                          {status === 'active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {status === 'expired' && <XCircle className="w-3 h-3 mr-1" />}
                          {status === 'suspended' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      {/* Contact Info */}
                      <div className="text-sm space-y-1">
                        <p className="text-muted-foreground">{client.profiles?.email || 'No email'}</p>
                        {client.phone && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </p>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center justify-between text-sm py-2 border-t border-b">
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(client.subscription_expiry_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">
                            {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {/* Password Hint */}
                      <div className="text-xs">
                        <span className="text-muted-foreground">Password hint: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {client.temp_password_hint || 'Not set'}
                        </code>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowResetClientPasswordDialog(true);
                          }}
                        >
                          <Key className="w-3 h-3 mr-1" />
                          Reset Password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowExtendDialog(true);
                          }}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Extend
                        </Button>
                        {status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700"
                            onClick={() => toggleStatus(client, 'suspended')}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => toggleStatus(client, 'active')}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Extend Subscription Dialog */}
        <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Extend Subscription</DialogTitle>
              <DialogDescription>
                Extend subscription for {selectedClient?.pump_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Extend by (days)</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {[7, 30, 90, 365].map((days) => (
                  <Button
                    key={days}
                    variant={extendDays === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExtendDays(days)}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                className="mt-3"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
                Cancel
              </Button>
              <Button onClick={extendSubscription}>
                Extend Subscription
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Client Password Dialog */}
        <Dialog open={showResetClientPasswordDialog} onOpenChange={setShowResetClientPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Client Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedClient?.pump_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="text"
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
                <p className="text-xs text-muted-foreground">
                  The client will need to use this password to log in
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetClientPasswordDialog(false)}>
                Cancel
              </Button>
              <Button onClick={resetClientPassword}>
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
