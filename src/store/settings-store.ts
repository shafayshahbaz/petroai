import { create } from 'zustand';
// Removed persist middleware - settings now sync with cloud (clients table)

export interface BusinessProfile {
  companyName: string;
  customerId: string;
  address: string;
  gstNumber: string;
  phone: string;
}

interface SettingsState {
  businessProfile: BusinessProfile;
  lastBackupDate: string | null;
  accountCreatedAt: string | null;
  
  // Actions
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  setLastBackupDate: (date: string) => void;
  setAccountCreatedAt: (date: string) => void;
  clearAllData: () => void;
  
  // Backup/Restore - now cloud-based
  exportAllData: () => string;
  importAllData: (jsonData: string) => boolean;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  businessProfile: {
    companyName: '',
    customerId: '',
    address: '',
    gstNumber: '',
    phone: '',
  },
  lastBackupDate: null,
  accountCreatedAt: null,

  updateBusinessProfile: (profile) => {
    set((state) => ({
      businessProfile: { ...state.businessProfile, ...profile },
    }));
  },

  setLastBackupDate: (date) => {
    set({ lastBackupDate: date });
  },

  setAccountCreatedAt: (date) => {
    set({ accountCreatedAt: date });
  },

  clearAllData: () => {
    set({
      businessProfile: {
        companyName: '',
        customerId: '',
        address: '',
        gstNumber: '',
        phone: '',
      },
      lastBackupDate: null,
      accountCreatedAt: null,
    });
  },

  exportAllData: () => {
    // This will be called with all stores' data
    const settingsData = get();
    return JSON.stringify({
      settings: {
        businessProfile: settingsData.businessProfile,
        lastBackupDate: settingsData.lastBackupDate,
      },
      exportedAt: new Date().toISOString(),
      version: '1.0',
    });
  },

  importAllData: (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.settings) {
        set({
          businessProfile: data.settings.businessProfile || get().businessProfile,
          lastBackupDate: new Date().toISOString(),
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to import settings data:', error);
      return false;
    }
  },
}));
