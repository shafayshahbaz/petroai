import { useState } from 'react';
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
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
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
      tankId: tanks.find((t) => t.fuelType === fuelType)?.id || '',
    });
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

              {/* Tab C: Mapping Matrix */}
              <TabsContent value="mapping" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Map each nozzle to its fuel source tank. Only compatible tanks (same fuel type) are shown.
                </p>

                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {machines.flatMap((machine) =>
                        machine.nozzles.map((nozzle) => {
                          const compatibleTanks = tanks.filter((t) => t.fuelType === nozzle.fuelType);
                          
                          return (
                            <div
                              key={nozzle.id}
                              className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                            >
                              <div className="flex items-center gap-2 min-w-[180px]">
                                <span className={cn(
                                  "w-3 h-3 rounded-full",
                                  FUEL_TYPE_INFO[nozzle.fuelType].color
                                )} />
                                <span className="font-medium">{machine.name}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-mono">{nozzle.label}</span>
                              </div>
                              
                              <span className="text-muted-foreground text-sm">draws from</span>
                              
                              <Select
                                value={nozzle.tankId || ''}
                                onValueChange={(tankId) => mapNozzleToTank(machine.id, nozzle.id, tankId)}
                              >
                                <SelectTrigger className="w-52">
                                  <SelectValue placeholder="Select Tank" />
                                </SelectTrigger>
                                <SelectContent>
                                  {compatibleTanks.map((tank) => (
                                    <SelectItem key={tank.id} value={tank.id}>
                                      {tank.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
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
