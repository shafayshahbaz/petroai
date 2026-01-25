import { FuelType } from './petrol-pump';

// Underground Tank
export interface UndergroundTank {
  id: string;
  name: string;
  fuelType: FuelType;
  capacity: number; // in liters
  currentStock: number; // in liters
  createdAt: string;
  updatedAt: string;
}

// Chamber in a truck
export interface TruckChamber {
  id: string;
  chamberNumber: number;
  fuelType: FuelType;
  capacity: number; // in liters
  challanDip: number; // in cm
  physicalDip: number; // in cm
  destinationTankId: string | null;
}

// Density check data
export interface DensityCheck {
  challanDensity: number;
  challanTemp: number;
  physicalDensity: number;
  physicalTemp: number;
  correctedDensity: number;
  status: 'OK' | 'FAIL';
}

// Stock verification for each tank
export interface StockVerification {
  tankId: string;
  tankName: string;
  fuelType: FuelType;
  preUnloadStock: number;
  postUnloadStock: number;
  receivedQty: number;
  invoiceQty: number;
  difference: number; // shortage (-) or excess (+)
}

// Complete Purchase/Unloading record
export interface PurchaseEntry {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  totalInvoiceValue: number;
  chambers: TruckChamber[];
  densityCheck: DensityCheck;
  stockVerifications: StockVerification[];
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// Wizard step state
export interface UnloadingWizardState {
  currentStep: number;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  totalInvoiceValue: number;
  numberOfChambers: number;
  chambers: TruckChamber[];
  densityCheck: DensityCheck;
  stockVerifications: StockVerification[];
}

// Temperature correction to Standard Density at 15°C
// For MS/Power (density < 800): coefficient = 0.875
// For HSD (density >= 800): coefficient = 1.133
export function calculateCorrectedDensity(observedDensity: number, temperature: number, _fuelType?: FuelType): number {
  const refTemp = 15;
  const tempDiff = temperature - refTemp;
  
  // Determine coefficient based on observed density
  // MS/Power: 0.875 per °C
  // HSD: 1.133 per °C
  const coefficient = observedDensity < 800 ? 0.875 : 1.133;
  
  // Standard Density = Observed + ((Temp - 15) × coefficient)
  const standardDensity = observedDensity + (tempDiff * coefficient);
  
  // Return with 1 decimal place
  return Math.round(standardDensity * 10) / 10;
}

// No default tanks - new accounts start blank and must use Setup Wizard
