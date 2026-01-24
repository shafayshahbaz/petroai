import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Fuel, Gauge, Banknote, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePetrolPumpStore } from '@/store/petrol-pump-store';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_NOZZLE_CONFIG, FuelType } from '@/types/petrol-pump';
import { cn } from '@/lib/utils';

const fuelTypeColors: Record<FuelType, string> = {
  MS: 'bg-amber-500',
  HSD: 'bg-green-600',
  POWER: 'bg-blue-600',
};

const fuelTypeNames: Record<FuelType, string> = {
  MS: 'MS (Petrol)',
  HSD: 'HSD (Diesel)',
  POWER: 'POWER (Premium)',
};

const steps = [
  { id: 1, title: 'Company Profile', icon: Building2 },
  { id: 2, title: 'Opening Cash', icon: Banknote },
  { id: 3, title: 'Tank Stock', icon: Fuel },
  { id: 4, title: 'Nozzle Readings', icon: Gauge },
];

export default function CompanySettings() {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    companySettings,
    tankStocks,
    initialCashBalance,
    updateCompanySettings,
    updateTankStock,
    updateInitialNozzleReading,
    updateInitialCashBalance,
    completeInitialSetup,
    initialNozzleReadings,
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
            <p className="text-sm text-muted-foreground">
              Enter the current dip/stock level for each fuel tank (in Liters).
            </p>
            <div className="grid gap-4">
              {tankStocks.map((tank) => (
                <div key={tank.fuelType} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className={cn("w-4 h-4 rounded-full", fuelTypeColors[tank.fuelType])} />
                  <div className="flex-1">
                    <p className="font-medium">{fuelTypeNames[tank.fuelType]}</p>
                    <p className="text-xs text-muted-foreground">Capacity: {tank.capacity.toLocaleString()} L</p>
                  </div>
                  <div className="w-40">
                    <Input
                      type="number"
                      value={tank.currentStock || ''}
                      onChange={(e) => updateTankStock(tank.fuelType, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-right"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">L</span>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Enter the current meter readings for all nozzles. These will become the opening readings for your first entry.
            </p>
            {(['MS', 'POWER', 'HSD'] as FuelType[]).map((fuelType) => {
              const nozzles = DEFAULT_NOZZLE_CONFIG.filter((n) => n.fuelType === fuelType);
              return (
                <div key={fuelType} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-3 h-3 rounded-full", fuelTypeColors[fuelType])} />
                    <h4 className="font-medium">{fuelTypeNames[fuelType]}</h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {nozzles.map((nozzle) => {
                      const nozzleId = `nozzle-${nozzle.fuelType}-${nozzle.label}`;
                      return (
                        <div key={nozzleId} className="flex items-center gap-2 p-3 border rounded-lg">
                          <span className="text-sm font-medium w-12">{nozzle.label}</span>
                          <Input
                            type="number"
                            step="0.001"
                            value={initialNozzleReadings[nozzleId] || ''}
                            onChange={(e) => updateInitialNozzleReading(nozzleId, parseFloat(e.target.value) || 0)}
                            placeholder="0.000"
                            className="text-right font-mono"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Company Settings</h1>
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
            {currentStep === 3 && 'Enter current fuel stock levels'}
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
