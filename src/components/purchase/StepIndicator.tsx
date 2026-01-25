import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  step < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step === currentStep
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step < currentStep ? <Check className="w-5 h-5" /> : step}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 text-center max-w-[80px]",
                  step === currentStep ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {stepLabels[index]}
              </span>
            </div>
            
            {/* Connector line */}
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "flex-1 h-1 mx-2",
                  step < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
