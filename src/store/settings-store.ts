import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  
  // Actions
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  setLastBackupDate: (date: string) => void;
  
  // Backup/Restore
  exportAllData: () => string;
  importAllData: (jsonData: string) => boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      businessProfile: {
        companyName: 'KGN Fuel Centre',
        customerId: '',
        address: '',
        gstNumber: '',
        phone: '',
      },
      lastBackupDate: null,

      updateBusinessProfile: (profile) => {
        set((state) => ({
          businessProfile: { ...state.businessProfile, ...profile },
        }));
      },

      setLastBackupDate: (date) => {
        set({ lastBackupDate: date });
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
    }),
    {
      name: 'settings-storage',
    }
  )
);
