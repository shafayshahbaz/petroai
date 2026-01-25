import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import DailyEntry from "./pages/DailyEntry";
import SalesReport from "./pages/SalesReport";
import CompanySettings from "./pages/CompanySettings";
import StockPurchases from "./pages/StockPurchases";
import Stock from "./pages/Stock";
import SalesByPerson from "./pages/SalesByPerson";
import TotalSales from "./pages/TotalSales";
import StaffSalary from "./pages/StaffSalary";
import Debtors from "./pages/Debtors";
import Expenses from "./pages/Expenses";
import NotFound from "./pages/NotFound";
import { usePetrolPumpStore } from "./store/petrol-pump-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AppRoutes() {
  const isInitialized = usePetrolPumpStore((state) => state.companySettings.isInitialized);

  // Redirect to settings if not initialized
  if (!isInitialized) {
    return (
      <Routes>
        <Route path="/settings" element={<CompanySettings />} />
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/daily-entry" element={<DailyEntry />} />
      <Route path="/sales-report" element={<SalesReport />} />
      <Route path="/sales-by-person" element={<SalesByPerson />} />
      <Route path="/total-sales" element={<TotalSales />} />
      <Route path="/stock-purchases" element={<StockPurchases />} />
      <Route path="/stock" element={<Stock />} />
      <Route path="/staff-salary" element={<StaffSalary />} />
      <Route path="/debtors" element={<Debtors />} />
      <Route path="/expenses" element={<Expenses />} />
      <Route path="/settings" element={<CompanySettings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <AppRoutes />
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
