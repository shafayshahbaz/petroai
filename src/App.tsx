import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { CloudDataProvider } from "./contexts/CloudDataContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionBanner } from "./components/SubscriptionBanner";
import { OfflineBanner } from "./components/layout/OfflineBanner";
import { MainLayout } from "./components/layout/MainLayout";
import { SessionTimeoutProvider } from "./components/SessionTimeoutProvider";
import Dashboard from "./pages/Dashboard";
import DailyEntry from "./pages/DailyEntry";
import PersonEntry from "./pages/PersonEntry";
import SalesReport from "./pages/SalesReport";
import Ledger from "./pages/Ledger";
import Debtors from "./pages/Debtors";
import Purchase from "./pages/Purchase";
import NewPurchase from "./pages/NewPurchase";
import Stock from "./pages/Stock";
import Settings from "./pages/Settings";
import HowToUse from "./pages/HowToUse";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <CloudDataProvider>
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
                      <OfflineBanner />
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
                    <OfflineBanner />
                    <SubscriptionBanner />
                    <MainLayout>
                      <DailyEntry />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/person-entry"
                element={
                  <ProtectedRoute>
                    <OfflineBanner />
                    <SubscriptionBanner />
                    <MainLayout>
                      <PersonEntry />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales-report"
                element={
                  <ProtectedRoute>
                    <OfflineBanner />
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
                    <OfflineBanner />
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
                    <OfflineBanner />
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
                    <OfflineBanner />
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
                    <OfflineBanner />
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
                    <OfflineBanner />
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
                    <OfflineBanner />
                    <SubscriptionBanner />
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/how-to-use"
                element={
                  <ProtectedRoute>
                    <OfflineBanner />
                    <SubscriptionBanner />
                    <MainLayout>
                      <HowToUse />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </CloudDataProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
