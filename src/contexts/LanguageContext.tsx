import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    hi: string;
  };
}

const translations: Translations = {
  // Sidebar Navigation
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  dailyEntry: { en: 'Daily Entry', hi: 'दैनिक प्रविष्टि' },
  personEntry: { en: 'Person Entry', hi: 'व्यक्तिगत प्रविष्टि' },
  purchase: { en: 'Purchase', hi: 'खरीद' },
  stock: { en: 'Stock', hi: 'स्टॉक' },
  salesReport: { en: 'Sales Report', hi: 'बिक्री रिपोर्ट' },
  dailySalesReport: { en: 'Daily Sales Report', hi: 'दैनिक बिक्री रिपोर्ट' },
  ledger: { en: 'Ledger', hi: 'खाता बही' },
  debtors: { en: 'Debtors', hi: 'देनदार' },
  bank: { en: 'Bank', hi: 'बैंक' },
  dip: { en: 'Dip', hi: 'डिप' },
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  howToUse: { en: 'How to Use', hi: 'कैसे उपयोग करें' },
  
  // Common Actions
  save: { en: 'Save', hi: 'सेव करें' },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  add: { en: 'Add', hi: 'जोड़ें' },
  edit: { en: 'Edit', hi: 'संपादित करें' },
  delete: { en: 'Delete', hi: 'हटाएं' },
  submit: { en: 'Submit', hi: 'जमा करें' },
  close: { en: 'Close', hi: 'बंद करें' },
  back: { en: 'Back', hi: 'वापस' },
  next: { en: 'Next', hi: 'आगे' },
  
  // Dashboard Headers
  todaysSales: { en: "Today's Sales", hi: 'आज की बिक्री' },
  cashInHand: { en: 'Cash in Hand', hi: 'हाथ में नकदी' },
  totalExpenses: { en: 'Total Expenses', hi: 'कुल खर्चा' },
  creditSales: { en: 'Credit Sales', hi: 'उधार बिक्री' },
  
  // Common Labels
  date: { en: 'Date', hi: 'तारीख' },
  amount: { en: 'Amount', hi: 'राशि' },
  quantity: { en: 'Quantity', hi: 'मात्रा' },
  price: { en: 'Price', hi: 'कीमत' },
  total: { en: 'Total', hi: 'कुल' },
  
  // Fuel Types
  petrol: { en: 'Petrol (MS)', hi: 'पेट्रोल (MS)' },
  diesel: { en: 'Diesel (HSD)', hi: 'डीजल (HSD)' },
  power: { en: 'Power', hi: 'पावर' },
  
  // Tutorial Page
  tutorialTitle: { en: 'How to Use', hi: 'कैसे उपयोग करें' },
  tutorialDescription: { en: 'Watch this tutorial to learn how to use the application', hi: 'एप्लिकेशन का उपयोग करना सीखने के लिए यह ट्यूटोरियल देखें' },
  tutorialComingSoon: { en: 'Tutorial coming soon.', hi: 'ट्यूटोरियल जल्द आ रहा है।' },
  tutorialNotSet: { en: 'The administrator has not yet set up a tutorial video.', hi: 'व्यवस्थापक ने अभी तक ट्यूटोरियल वीडियो सेट नहीं किया है।' },
  
  // Logout
  logOut: { en: 'Log Out', hi: 'लॉग आउट' },
  loggingOut: { en: 'Logging out...', hi: 'लॉग आउट हो रहा है...' },
  
  // Management System
  managementSystem: { en: 'Management System', hi: 'प्रबंधन प्रणाली' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
