import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Fuel, Database, Settings, ArrowRight, ArrowLeft, 
  Plus, Trash2, Check, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseStore } from '@/store/purchase-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FuelType } from '@/types/petrol-pump';

interface TankSetup {
  id: string;
  name: string;
  fuelType: FuelType;
  capacity: number;
  currentStock: number;
}

interface NozzleSetup {
  id: string;
  name: string;
  fuelType: FuelType;
  machineId: string;
}

interface MachineSetup {
  id: string;
  name: string;
}

const FUEL_COLORS = {
  MS: '#F97316',
  HSD: '#3B82F6',
  POWER: '#EC4899',
};

export default function SetupWizard() {
  const navigate = useNavigate();
  const { user, refreshSubscriptionStatus } = useAuth();
  const { toast } = useToast();
  const { addTank, connectNozzleToTank } = usePurchaseStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [tankSetups, setTankSetups] = useState<TankSetup[]>([
    { id: '1', name: 'Tank 1', fuelType: 'MS', capacity: 10000, currentStock: 0 },
  ]);
  const [machineSetups, setMachineSetups] = useState<MachineSetup[]>([
    { id: '1', name: 'Machine 1' },
  ]);
  const [nozzleSetups, setNozzleSetups] = useState<NozzleSetup[]>([
    { id: '1', name: 'Nozzle 1', fuelType: 'MS', machineId: '1' },
  ]);
  const [tankConnections, setTankConnections] = useState<Record<string, string>>({});

  const steps = [
    { number: 1, title: 'Tanks', icon: Database },
    { number: 2, title: 'Machines & Nozzles', icon: Fuel },
    { number: 3, title: 'Connect', icon: Link2 },
  ];

  const addTankSetup = () => {
    const newId = String(tankSetups.length + 1);
    setTankSetups([...tankSetups, {
      id: newId,
      name: `Tank ${newId}`,
      fuelType: 'MS',
      capacity: 10000,
      currentStock: 0,
    }]);
  };

  const removeTankSetup = (id: string) => {
    if (tankSetups.length > 1) {
      setTankSetups(tankSetups.filter(t => t.id !== id));
    }
  };

  const addMachineSetup = () => {
    const newId = String(machineSetups.length + 1);
    setMachineSetups([...machineSetups, { id: newId, name: `Machine ${newId}` }]);
  };

  const addNozzleSetup = () => {
    const newId = String(nozzleSetups.length + 1);
    setNozzleSetups([...nozzleSetups, {
      id: newId,
      name: `Nozzle ${newId}`,
      fuelType: 'MS',
      machineId: machineSetups[0]?.id || '1',
    }]);
  };

  const finishSetup = async () => {
    try {
      // Add tanks to store
      const addedTanks: Record<string, string> = {};
      tankSetups.forEach(tank => {
        const newTank = addTank({
          name: tank.name,
          fuelType: tank.fuelType,
          capacity: tank.capacity,
          currentStock: tank.currentStock,
        });
        addedTanks[tank.id] = newTank.id;
      });

      // Connect nozzles to tanks (using setup IDs for demo)
      // In real implementation, this would connect to actual nozzle IDs from petrol-pump-store
      Object.entries(tankConnections).forEach(([nozzleSetupId, tankSetupId]) => {
        if (addedTanks[tankSetupId]) {
          // For demo, create a synthetic nozzle ID
          const nozzleSetup = nozzleSetups.find(n => n.id === nozzleSetupId);
          if (nozzleSetup) {
            const syntheticNozzleId = `nozzle-${nozzleSetup.fuelType}-${nozzleSetup.name}`;
            connectNozzleToTank(syntheticNozzleId, addedTanks[tankSetupId]);
          }
        }
      });

      // Mark first login as complete
      if (user) {
        await supabase
          .from('clients')
          .update({ is_first_login: false })
          .eq('user_id', user.id);
      }

      await refreshSubscriptionStatus();

      toast({
        title: 'Setup Complete!',
        description: 'Your pump has been configured successfully.',
      });

      navigate('/');
    } catch (error) {
      console.error('Setup error:', error);
      toast({
        title: 'Setup Failed',
        description: 'There was an error setting up your pump. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Settings className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Pump Setup Wizard</h1>
          <p className="text-muted-foreground mt-2">Let's configure your petrol pump infrastructure</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep >= step.number 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span className={`text-sm font-medium ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 ${currentStep > step.number ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Tanks */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Underground Tanks
              </CardTitle>
              <CardDescription>How many tanks do you have? Configure their capacities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tankSetups.map((tank, index) => (
                <div key={tank.id} className="flex items-center gap-4 p-4 border rounded-lg" style={{ borderLeftColor: FUEL_COLORS[tank.fuelType], borderLeftWidth: 4 }}>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={tank.name}
                        onChange={(e) => {
                          const updated = [...tankSetups];
                          updated[index].name = e.target.value;
                          setTankSetups(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Fuel Type</Label>
                      <Select
                        value={tank.fuelType}
                        onValueChange={(value: FuelType) => {
                          const updated = [...tankSetups];
                          updated[index].fuelType = value;
                          setTankSetups(updated);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MS">MS (Petrol)</SelectItem>
                          <SelectItem value="HSD">HSD (Diesel)</SelectItem>
                          <SelectItem value="POWER">POWER (Premium)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Capacity (L)</Label>
                      <Input
                        type="number"
                        value={tank.capacity}
                        onChange={(e) => {
                          const updated = [...tankSetups];
                          updated[index].capacity = parseInt(e.target.value) || 0;
                          setTankSetups(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Current Stock (L)</Label>
                      <Input
                        type="number"
                        value={tank.currentStock}
                        onChange={(e) => {
                          const updated = [...tankSetups];
                          updated[index].currentStock = parseInt(e.target.value) || 0;
                          setTankSetups(updated);
                        }}
                      />
                    </div>
                  </div>
                  {tankSetups.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeTankSetup(tank.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addTankSetup} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Another Tank
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Machines & Nozzles */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-primary" />
                  Dispensing Machines
                </CardTitle>
                <CardDescription>How many dispensing machines do you have?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {machineSetups.map((machine, index) => (
                  <div key={machine.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label>Machine Name</Label>
                      <Input
                        value={machine.name}
                        onChange={(e) => {
                          const updated = [...machineSetups];
                          updated[index].name = e.target.value;
                          setMachineSetups(updated);
                        }}
                      />
                    </div>
                    {machineSetups.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setMachineSetups(machineSetups.filter(m => m.id !== machine.id))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addMachineSetup} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Machine
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nozzles</CardTitle>
                <CardDescription>Configure your dispensing nozzles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {nozzleSetups.map((nozzle, index) => (
                  <div key={nozzle.id} className="flex items-center gap-4 p-4 border rounded-lg" style={{ borderLeftColor: FUEL_COLORS[nozzle.fuelType], borderLeftWidth: 4 }}>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={nozzle.name}
                          onChange={(e) => {
                            const updated = [...nozzleSetups];
                            updated[index].name = e.target.value;
                            setNozzleSetups(updated);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Fuel Type</Label>
                        <Select
                          value={nozzle.fuelType}
                          onValueChange={(value: FuelType) => {
                            const updated = [...nozzleSetups];
                            updated[index].fuelType = value;
                            setNozzleSetups(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MS">MS (Petrol)</SelectItem>
                            <SelectItem value="HSD">HSD (Diesel)</SelectItem>
                            <SelectItem value="POWER">POWER (Premium)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Machine</Label>
                        <Select
                          value={nozzle.machineId}
                          onValueChange={(value) => {
                            const updated = [...nozzleSetups];
                            updated[index].machineId = value;
                            setNozzleSetups(updated);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {machineSetups.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {nozzleSetups.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setNozzleSetups(nozzleSetups.filter(n => n.id !== nozzle.id))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addNozzleSetup} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Nozzle
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Connect */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Connect Nozzles to Tanks
              </CardTitle>
              <CardDescription>Select which tank each nozzle draws fuel from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nozzleSetups.map((nozzle) => {
                const compatibleTanks = tankSetups.filter(t => t.fuelType === nozzle.fuelType);
                return (
                  <div key={nozzle.id} className="flex items-center gap-4 p-4 border rounded-lg" style={{ borderLeftColor: FUEL_COLORS[nozzle.fuelType], borderLeftWidth: 4 }}>
                    <div className="flex-1">
                      <p className="font-medium">{nozzle.name}</p>
                      <p className="text-sm text-muted-foreground">{nozzle.fuelType} • {machineSetups.find(m => m.id === nozzle.machineId)?.name}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className="w-48">
                      <Select
                        value={tankConnections[nozzle.id] || ''}
                        onValueChange={(value) => {
                          setTankConnections({ ...tankConnections, [nozzle.id]: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tank..." />
                        </SelectTrigger>
                        <SelectContent>
                          {compatibleTanks.map(tank => (
                            <SelectItem key={tank.id} value={tank.id}>{tank.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {currentStep < 3 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={finishSetup} className="bg-gradient-to-r from-emerald-500 to-green-600">
              <Check className="w-4 h-4 mr-2" />
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
