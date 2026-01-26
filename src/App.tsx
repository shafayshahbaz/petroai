import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionBanner } from "./components/SubscriptionBanner";
import { MandatoryBackupModal } from "./components/backup/BackupManager";
import { MainLayout } from "./components/layout/MainLayout";
import { SessionTimeoutProvider } from "./components/SessionTimeoutProvider";
import Dashboard from "./pages/Dashboard";
import DailyEntry from "./pages/DailyEntry";
import SalesReport from "./pages/SalesReport";
import Ledger from "./pages/Ledger";
import Debtors from "./pages/Debtors";
import Purchase from "./pages/Purchase";
import NewPurchase from "./pages/NewPurchase";
import Stock from "./pages/Stock";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminLogin />} />
            
            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Protected pump owner routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <SessionTimeoutProvider>
                    <SubscriptionBanner />
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </SessionTimeoutProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/daily-entry"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MainLayout>
                    <DailyEntry />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales-report"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MainLayout>
                    <SalesReport />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ledger"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MainLayout>
                    <Ledger />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/debtors"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MainLayout>
                    <Debtors />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MainLayout>
                    <Purchase />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase/new"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MainLayout>
                    <NewPurchase />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MainLayout>
                    <Stock />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SubscriptionBanner />
                  <MandatoryBackupModal />
                  <MainLayout>
                    <Settings />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
