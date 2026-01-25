import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Fuel, 
  Gauge, 
  Banknote, 
  Check, 
  ArrowRight,
  Plus,
  Trash2,
  Settings2,
  Link2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { FuelType, FUEL_TYPE_INFO } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

const fuelTypes: FuelType[] = ['MS', 'HSD', 'POWER'];

const steps = [
  { id: 1, title: 'Company Profile', icon: Building2 },
  { id: 2, title: 'Opening Cash', icon: Banknote },
  { id: 3, title: 'Tank Stock', icon: Fuel },
  { id: 4, title: 'Nozzle Readings', icon: Gauge },
];

export default function CompanySettings() {
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('tanks');
  const [newMachineName, setNewMachineName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    companySettings,
    tanks,
    machines,
    initialCashBalance,
    initialNozzleReadings,
    updateCompanySettings,
    addTank,
    updateTank,
    deleteTank,
    addMachine,
    updateMachine,
    deleteMachine,
    addNozzleToMachine,
    updateMachineNozzle,
    deleteNozzleFromMachine,
    mapNozzleToTank,
    updateInitialNozzleReading,
    updateInitialCashBalance,
    completeInitialSetup,
  } = usePetrolPumpStore();

  // Get all assigned nozzle IDs for exclusivity check
  const assignedNozzleIds = useMemo(() => {
    const assigned = new Set<string>();
    machines.forEach((machine) => {
      machine.nozzles.forEach((nozzle) => {
        if (nozzle.tankId) {
          assigned.add(nozzle.id);
        }
      });
    });
    return assigned;
  }, [machines]);

  // Get available nozzles for a specific tank (same fuel type & not assigned elsewhere)
  const getAvailableNozzlesForTank = (tankId: string, tankFuelType: FuelType) => {
    const availableNozzles: Array<{ id: string; label: string; machineId: string; machineName: string; fuelType: FuelType }> = [];
    
    machines.forEach((machine) => {
      machine.nozzles.forEach((nozzle) => {
        // Rule A: Only show nozzles matching the tank's fuel type
        // Rule B: Only show unassigned nozzles OR nozzles already assigned to this tank
        if (nozzle.fuelType === tankFuelType && (!nozzle.tankId || nozzle.tankId === tankId)) {
          availableNozzles.push({
            id: nozzle.id,
            label: nozzle.label,
            machineId: machine.id,
            machineName: machine.name,
            fuelType: nozzle.fuelType,
          });
        }
      });
    });
    
    return availableNozzles;
  };

  // Get nozzles currently assigned to a tank
  const getNozzlesForTank = (tankId: string) => {
    const nozzles: Array<{ id: string; label: string; machineId: string; machineName: string }> = [];
    
    machines.forEach((machine) => {
      machine.nozzles.forEach((nozzle) => {
        if (nozzle.tankId === tankId) {
          nozzles.push({
            id: nozzle.id,
            label: nozzle.label,
            machineId: machine.id,
            machineName: machine.name,
          });
        }
      });
    });
    
    return nozzles;
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    completeInitialSetup();
    toast({
      title: 'Setup Complete!',
      description: 'Your petrol pump is now configured and ready to use.',
    });
    navigate('/');
  };

  const handleAddTank = () => {
    addTank({
      name: `New Tank ${tanks.length + 1}`,
      fuelType: 'MS',
      capacity: 20000,
      currentStock: 0,
      lowStockThreshold: 1000,
    });
  };

  const handleAddMachine = () => {
    if (newMachineName.trim()) {
      addMachine(newMachineName.trim());
      setNewMachineName('');
    }
  };

  const handleAddNozzle = (machineId: string, fuelType: FuelType) => {
    const machine = machines.find((m) => m.id === machineId);
    const nozzleCount = machine?.nozzles.length || 0;
    addNozzleToMachine(machineId, {
      label: `N${nozzleCount + 1}`,
      fuelType,
      tankId: '', // Not assigned initially
    });
  };

  const handleRemoveNozzleFromTank = (machineId: string, nozzleId: string) => {
    mapNozzleToTank(machineId, nozzleId, '');
  };

  const handleAssignNozzleToTank = (machineId: string, nozzleId: string, tankId: string) => {
    mapNozzleToTank(machineId, nozzleId, tankId);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Petrol Pump Name</Label>
                <Input
                  id="name"
                  value={companySettings.name}
                  onChange={(e) => updateCompanySettings({ name: e.target.value })}
                  placeholder="e.g., KGN Fuel Centre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={companySettings.phone}
                  onChange={(e) => updateCompanySettings({ phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={companySettings.address}
                onChange={(e) => updateCompanySettings({ address: e.target.value })}
                placeholder="Full address of your petrol pump"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">GST Number</Label>
              <Input
                id="gst"
                value={companySettings.gstNumber}
                onChange={(e) => updateCompanySettings({ gstNumber: e.target.value })}
                placeholder="e.g., 29AABCU9603R1ZM"
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <Banknote className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Opening Cash Balance</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the total cash currently in your drawer. This will be your starting balance.
              </p>
              <div className="max-w-xs mx-auto">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={initialCashBalance || ''}
                    onChange={(e) => updateInitialCashBalance(parseFloat(e.target.value) || 0)}
                    className="pl-8 text-2xl font-mono h-14 text-center"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tanks">
                  <Fuel className="w-4 h-4 mr-2" />
                  Tanks
                </TabsTrigger>
                <TabsTrigger value="machines">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Machines
                </TabsTrigger>
                <TabsTrigger value="mapping">
                  <Link2 className="w-4 h-4 mr-2" />
                  Mapping
                </TabsTrigger>
              </TabsList>

              {/* Tab A: Tank Management */}
              <TabsContent value="tanks" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Add and configure your fuel storage tanks
                  </p>
                  <Button onClick={handleAddTank} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tank
                  </Button>
                </div>

                <div className="grid gap-4">
                  {tanks.map((tank) => {
                    const fillPercent = tank.capacity > 0 
                      ? Math.min(100, (tank.currentStock / tank.capacity) * 100) 
                      : 0;
                    const isLowStock = tank.currentStock <= tank.lowStockThreshold;
                    const assignedNozzles = getNozzlesForTank(tank.id);
                    
                    return (
                      <Card key={tank.id} className={cn(
                        "relative",
                        isLowStock && "border-destructive"
                      )}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-3 h-16 rounded-full",
                              FUEL_TYPE_INFO[tank.fuelType].color
                            )} />
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center gap-3">
                                <Input
                                  value={tank.name}
                                  onChange={(e) => updateTank(tank.id, { name: e.target.value })}
                                  className="font-medium"
                                  placeholder="Tank name"
                                />
                                <Select
                                  value={tank.fuelType}
                                  onValueChange={(value: FuelType) => updateTank(tank.id, { fuelType: value })}
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fuelTypes.map((ft) => (
                                      <SelectItem key={ft} value={ft}>
                                        {FUEL_TYPE_INFO[ft].name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteTank(tank.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <Label className="text-xs">Capacity (L)</Label>
                                  <Input
                                    type="number"
                                    value={tank.capacity || ''}
                                    onChange={(e) => updateTank(tank.id, { capacity: parseFloat(e.target.value) || 0 })}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Current Stock (L)</Label>
                                  <Input
                                    type="number"
                                    value={tank.currentStock || ''}
                                    onChange={(e) => updateTank(tank.id, { currentStock: parseFloat(e.target.value) || 0 })}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Low Stock Alert (L)</Label>
                                  <Input
                                    type="number"
                                    value={tank.lowStockThreshold || ''}
                                    onChange={(e) => updateTank(tank.id, { lowStockThreshold: parseFloat(e.target.value) || 0 })}
                                    className="h-8"
                                  />
                                </div>
                              </div>

                              {/* Connected Nozzles Badge */}
                              {assignedNozzles.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {assignedNozzles.map((nozzle) => (
                                    <Badge key={nozzle.id} variant="secondary" className="text-xs">
                                      {nozzle.machineName} → {nozzle.label}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Fill Level</span>
                                  <span>{tank.currentStock.toLocaleString()} / {tank.capacity.toLocaleString()} L ({fillPercent.toFixed(1)}%)</span>
                                </div>
                                <Progress 
                                  value={fillPercent} 
                                  className={cn(
                                    "h-3",
                                    isLowStock && "[&>div]:bg-destructive"
                                  )} 
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Tab B: Machine & Nozzle Setup */}
              <TabsContent value="machines" className="space-y-4 mt-4">
                <div className="flex justify-between items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Configure your dispensing machines and nozzles
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newMachineName}
                      onChange={(e) => setNewMachineName(e.target.value)}
                      placeholder="Machine name"
                      className="w-40"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddMachine()}
                    />
                    <Button onClick={handleAddMachine} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Machine
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {machines.map((machine) => (
                    <Card key={machine.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Settings2 className="w-5 h-5 text-muted-foreground" />
                            <Input
                              value={machine.name}
                              onChange={(e) => updateMachine(machine.id, { name: e.target.value })}
                              className="font-semibold w-40"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(value: FuelType) => handleAddNozzle(machine.id, value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue placeholder="Add Nozzle" />
                              </SelectTrigger>
                              <SelectContent>
                                {fuelTypes.map((ft) => (
                                  <SelectItem key={ft} value={ft}>
                                    {FUEL_TYPE_INFO[ft].name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMachine(machine.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {machine.nozzles.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No nozzles added. Select a fuel type above to add a nozzle.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {machine.nozzles.map((nozzle) => (
                              <div
                                key={nozzle.id}
                                className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                              >
                                <span className={cn(
                                  "w-2 h-2 rounded-full",
                                  FUEL_TYPE_INFO[nozzle.fuelType].color
                                )} />
                                <Input
                                  value={nozzle.label}
                                  onChange={(e) => updateMachineNozzle(machine.id, nozzle.id, { label: e.target.value })}
                                  className="w-16 h-7 text-sm"
                                />
                                <span className="text-xs text-muted-foreground">{nozzle.fuelType}</span>
                                {nozzle.tankId && (
                                  <Badge variant="outline" className="text-xs">
                                    Mapped
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => deleteNozzleFromMachine(machine.id, nozzle.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Tab C: Mapping Matrix - With Strict Rules */}
              <TabsContent value="mapping" className="space-y-4 mt-4">
                <div className="flex items-start gap-2 p-3 bg-info/10 border border-info/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-info shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-info">Mapping Rules:</p>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>• Nozzles can only be assigned to tanks with matching fuel type</li>
                      <li>• Each nozzle can only be connected to ONE tank at a time</li>
                      <li>• To reassign a nozzle, first remove it from its current tank</li>
                    </ul>
                  </div>
                </div>

                {tanks.map((tank) => {
                  const assignedNozzles = getNozzlesForTank(tank.id);
                  const availableNozzles = getAvailableNozzlesForTank(tank.id, tank.fuelType)
                    .filter(n => !assignedNozzles.some(an => an.id === n.id));

                  return (
                    <Card key={tank.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-3 h-3 rounded-full", FUEL_TYPE_INFO[tank.fuelType].color)} />
                            <CardTitle className="text-base">{tank.name}</CardTitle>
                            <Badge variant="outline">{tank.fuelType}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {assignedNozzles.length} nozzle(s) connected
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Assigned Nozzles */}
                        {assignedNozzles.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-2">Connected Nozzles:</p>
                            <div className="flex flex-wrap gap-2">
                              {assignedNozzles.map((nozzle) => (
                                <div
                                  key={nozzle.id}
                                  className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-lg"
                                >
                                  <span className={cn("w-2 h-2 rounded-full", FUEL_TYPE_INFO[tank.fuelType].color)} />
                                  <span className="text-sm font-medium">{nozzle.machineName}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-mono text-sm">{nozzle.label}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 ml-1"
                                    onClick={() => handleRemoveNozzleFromTank(nozzle.machineId, nozzle.id)}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Available Nozzles to Add */}
                        {availableNozzles.length > 0 ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Available {tank.fuelType} Nozzles:</p>
                            <div className="flex flex-wrap gap-2">
                              {availableNozzles.map((nozzle) => (
                                <Button
                                  key={nozzle.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignNozzleToTank(nozzle.machineId, nozzle.id, tank.id)}
                                  className="gap-2"
                                >
                                  <Plus className="w-3 h-3" />
                                  {nozzle.machineName} → {nozzle.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {assignedNozzles.length === 0 
                              ? `No ${tank.fuelType} nozzles available. Create nozzles in the Machines tab first.`
                              : `All ${tank.fuelType} nozzles are assigned.`
                            }
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            </Tabs>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Enter the current meter readings for all nozzles. These will become the opening readings for your first entry.
            </p>
            
            {machines.map((machine) => (
              <Card key={machine.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    {machine.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {machine.nozzles.map((nozzle) => {
                      const tank = tanks.find((t) => t.id === nozzle.tankId);
                      return (
                        <div 
                          key={nozzle.id} 
                          className="flex items-center gap-2 p-3 border rounded-lg"
                          title={tank ? `Connected to ${tank.name}` : 'No tank connected'}
                        >
                          <span className={cn(
                            "w-3 h-3 rounded-full",
                            FUEL_TYPE_INFO[nozzle.fuelType].color
                          )} />
                          <span className="text-sm font-medium w-12">{nozzle.label}</span>
                          <Input
                            type="number"
                            step="0.001"
                            value={initialNozzleReadings[nozzle.id] || ''}
                            onChange={(e) => updateInitialNozzleReading(nozzle.id, parseFloat(e.target.value) || 0)}
                            placeholder="0.000"
                            className="text-right font-mono"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Configuration</h1>
        <p className="text-muted-foreground">
          {companySettings.isInitialized 
            ? 'Update your petrol pump configuration'
            : 'Set up your petrol pump for the first time'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                    currentStep > step.id
                      ? "bg-success text-success-foreground"
                      : currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <p className={cn(
                  "mt-2 text-sm font-medium",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-1 w-full mx-4 rounded",
                    currentStep > step.id ? "bg-success" : "bg-muted"
                  )}
                  style={{ minWidth: '60px' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Step Indicator */}
      <div className="md:hidden">
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
              </span>
              <span className="font-medium">{steps[currentStep - 1].title}</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = steps[currentStep - 1].icon;
              return <StepIcon className="w-5 h-5" />;
            })()}
            {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Enter your business details'}
            {currentStep === 2 && 'Set your starting cash balance'}
            {currentStep === 3 && 'Configure tanks, machines, and nozzle mappings'}
            {currentStep === 4 && 'Enter current nozzle meter readings'}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleComplete} className="bg-success hover:bg-success/90">
            <Check className="w-4 h-4 mr-2" />
            Complete Setup
          </Button>
        )}
      </div>
    </div>
  );
}
