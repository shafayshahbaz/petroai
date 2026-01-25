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

// ASTM D1250 Table 53B correction using K0 coefficients
// Reference temperature is 15°C
export function calculateCorrectedDensity(observedDensity: number, temperature: number, _fuelType?: FuelType): number {
  const refTemp = 15;
  const tempDiff = temperature - refTemp;
  
  // Determine K0 based on observed density (ASTM D1250 Table 53B)
  // If density < 800: MS (Petrol) K0 = 346.4228
  // If density >= 800: HSD (Diesel) K0 = 186.9696
  const K0 = observedDensity < 800 ? 346.4228 : 186.9696;
  
  // Calculate thermal expansion coefficient alpha
  // α = K0 / (density^2) per °C (simplified from ASTM polynomial)
  const alpha = K0 / (observedDensity * observedDensity);
  
  // Volume Correction Factor (VCF) at reference temperature
  const vcf = 1 - (alpha * tempDiff);
  
  // Standard density at 15°C = observed density / VCF
  const standardDensity = observedDensity / vcf;
  
  // Return with high precision (2 decimal places)
  return Math.round(standardDensity * 100) / 100;
}

// Default tanks for initial setup
export const DEFAULT_TANKS: Omit<UndergroundTank, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'MS Tank 1', fuelType: 'MS', capacity: 12000, currentStock: 0 },
  { name: 'MS Tank 2', fuelType: 'MS', capacity: 12000, currentStock: 0 },
  { name: 'HSD Tank 1', fuelType: 'HSD', capacity: 12000, currentStock: 0 },
  { name: 'Power Tank 1', fuelType: 'POWER', capacity: 6000, currentStock: 0 },
];
