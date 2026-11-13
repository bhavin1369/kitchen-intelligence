import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { Layout } from "./components/layout/Layout"

// Pages
import { DashboardPage } from "./pages/DashboardPage"
import { LoginPage } from "./pages/LoginPage"
import { SalesPage } from "./pages/SalesPage"
import { MenuRecipesPage } from "./pages/MenuRecipesPage"
import { ForecastPage } from "./pages/ForecastPage"
import { InventoryPage } from "./pages/InventoryPage"
import { ProcurementPage } from "./pages/ProcurementPage"
import { WasteManagementPage } from "./pages/WasteManagementPage"
import { ExpiryAlertsPage } from "./pages/ExpiryAlertsPage"
import { LeftoverSuggestionsPage } from "./pages/LeftoverSuggestionsPage"
import { AnalyticsPage } from "./pages/AnalyticsPage"
import { SettingsPage } from "./pages/SettingsPage"

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span>Loading Kitchen Intelligence Engine...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="menu" element={<MenuRecipesPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="procurement" element={<ProcurementPage />} />
            <Route path="waste" element={<WasteManagementPage />} />
            <Route path="expiry-alerts" element={<ExpiryAlertsPage />} />
            <Route path="leftover-recipes" element={<LeftoverSuggestionsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

