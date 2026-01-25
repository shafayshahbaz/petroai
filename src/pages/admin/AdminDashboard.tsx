import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Users, Plus, RefreshCw, LogOut, Search,
  Calendar, Phone, Building2, CheckCircle2, XCircle, Clock,
  Key, Trash2, Edit2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';

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
      // Fetch clients first
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch profiles separately and match by user_id
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email');

      if (profilesError) throw profilesError;

      // Merge the data
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
      // Create user with Supabase Auth
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

      // Create client record
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
      // Call edge function to reset client password
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

      // Update the password hint
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

  const getStatusBadge = (status: string, expiryDate: string) => {
    const isExpired = new Date(expiryDate) < new Date();
    
    if (isExpired || status === 'expired') {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Expired</Badge>;
    }
    if (status === 'suspended') {
      return <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3" /> Suspended</Badge>;
    }
    return <Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Active</Badge>;
  };

  const filteredClients = clients.filter(client =>
    client.pump_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.subscription_status === 'active' && new Date(c.subscription_expiry_date) > new Date()).length,
    expired: clients.filter(c => c.subscription_status === 'expired' || new Date(c.subscription_expiry_date) < new Date()).length,
    suspended: clients.filter(c => c.subscription_status === 'suspended').length,
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Super Admin Panel</h1>
              <p className="text-sm text-slate-400">Manage all pump clients</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Change Admin Password</DialogTitle>
                  <DialogDescription className="text-slate-400">
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
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="border-slate-600">
                    Cancel
                  </Button>
                  <Button onClick={changeAdminPassword} className="bg-gradient-to-r from-amber-500 to-orange-600">
                    Update Password
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              className="text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={() => signOut().then(() => navigate('/admin'))}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-slate-400">Total Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.active}</p>
                  <p className="text-sm text-slate-400">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.expired}</p>
                  <p className="text-sm text-slate-400">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.suspended}</p>
                  <p className="text-sm text-slate-400">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchClients} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Client
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Client</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Add a new petrol pump client to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Pump Name</Label>
                    <Input
                      placeholder="Enter pump name"
                      value={newClient.pumpName}
                      onChange={(e) => setNewClient({ ...newClient, pumpName: e.target.value })}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={newClient.ownerName}
                      onChange={(e) => setNewClient({ ...newClient, ownerName: e.target.value })}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Login ID)</Label>
                    <Input
                      type="email"
                      placeholder="client@example.com"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temporary Password</Label>
                    <Input
                      type="text"
                      placeholder="TempPass123"
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                      className="bg-slate-700 border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Client should change this on first login</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (Optional)</Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-slate-600">
                    Cancel
                  </Button>
                  <Button onClick={createClient} className="bg-gradient-to-r from-amber-500 to-orange-600">
                    Create Client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Clients Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Client Management</CardTitle>
            <CardDescription className="text-slate-400">
              View and manage all registered petrol pump clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow className="border-slate-700 hover:bg-slate-800">
                    <TableHead className="text-slate-300">Pump Details</TableHead>
                    <TableHead className="text-slate-300">Contact</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Expiry</TableHead>
                    <TableHead className="text-slate-300">Password Hint</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        Loading clients...
                      </TableCell>
                    </TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        No clients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{client.pump_name}</p>
                            <p className="text-sm text-slate-400">{client.owner_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-slate-300">{client.profiles?.email || 'N/A'}</p>
                            {client.phone && (
                              <p className="text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(client.subscription_status, client.subscription_expiry_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-300">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(client.subscription_expiry_date), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-slate-900 px-2 py-1 rounded text-amber-400">
                            {client.temp_password_hint || 'Not set'}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300"
                              title="Reset Password"
                              onClick={() => {
                                setSelectedClient(client);
                                setShowResetClientPasswordDialog(true);
                              }}
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-white"
                              title="Extend Subscription"
                              onClick={() => {
                                setSelectedClient(client);
                                setShowExtendDialog(true);
                              }}
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                            {client.subscription_status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-400 hover:text-amber-300"
                                title="Suspend"
                                onClick={() => toggleStatus(client, 'suspended')}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-400 hover:text-emerald-300"
                                title="Activate"
                                onClick={() => toggleStatus(client, 'active')}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Extend Subscription Dialog */}
        <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Extend Subscription</DialogTitle>
              <DialogDescription className="text-slate-400">
                Extend subscription for {selectedClient?.pump_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Extend by (days)</Label>
              <div className="flex gap-2 mt-2">
                {[7, 30, 90, 365].map((days) => (
                  <Button
                    key={days}
                    variant={extendDays === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExtendDays(days)}
                    className={extendDays === days ? 'bg-amber-500' : 'border-slate-600'}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                className="mt-3 bg-slate-700 border-slate-600"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExtendDialog(false)} className="border-slate-600">
                Cancel
              </Button>
              <Button onClick={extendSubscription} className="bg-gradient-to-r from-amber-500 to-orange-600">
                Extend Subscription
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Client Password Dialog */}
        <Dialog open={showResetClientPasswordDialog} onOpenChange={setShowResetClientPasswordDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Reset Client Password</DialogTitle>
              <DialogDescription className="text-slate-400">
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
                  className="bg-slate-700 border-slate-600"
                />
                <p className="text-xs text-slate-500">
                  The client will need to use this password to log in
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetClientPasswordDialog(false)} className="border-slate-600">
                Cancel
              </Button>
              <Button onClick={resetClientPassword} className="bg-gradient-to-r from-blue-500 to-blue-600">
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
