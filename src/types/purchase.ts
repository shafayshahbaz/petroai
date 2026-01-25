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

// ASTM Table 53B correction factors (simplified for common ranges)
// This is a simplified implementation - real ASTM tables have thousands of entries
export function calculateCorrectedDensity(observedDensity: number, temperature: number, fuelType: FuelType): number {
  // Reference temperature is 15°C
  const refTemp = 15;
  const tempDiff = temperature - refTemp;
  
  // Thermal expansion coefficients (approximate)
  // MS/Power (Petrol): ~0.00120 per °C
  // HSD (Diesel): ~0.00080 per °C
  const expansionCoeff = fuelType === 'HSD' ? 0.00080 : 0.00120;
  
  // Volume Correction Factor (VCF) based on ASTM Table 53B approximation
  const vcf = 1 - (expansionCoeff * tempDiff);
  
  // Corrected density at 15°C
  const correctedDensity = observedDensity / vcf;
  
  return Math.round(correctedDensity * 100) / 100;
}

// Default tanks for initial setup
export const DEFAULT_TANKS: Omit<UndergroundTank, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'MS Tank 1', fuelType: 'MS', capacity: 12000, currentStock: 0 },
  { name: 'MS Tank 2', fuelType: 'MS', capacity: 12000, currentStock: 0 },
  { name: 'HSD Tank 1', fuelType: 'HSD', capacity: 12000, currentStock: 0 },
  { name: 'Power Tank 1', fuelType: 'POWER', capacity: 6000, currentStock: 0 },
];
