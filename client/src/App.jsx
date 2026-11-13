import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { Layout } from "./components/layout/Layout"

// 11 Core Pages
import { DashboardPage } from "./pages/DashboardPage"
import { SalesPage } from "./pages/SalesPage"
import { MenuPage } from "./pages/MenuPage"
import { RecipePage } from "./pages/RecipePage"
import { ForecastPage } from "./pages/ForecastPage"
import { InventoryPage } from "./pages/InventoryPage"
import { PurchasePlannerPage } from "./pages/PurchasePlannerPage"
import { WasteManagementPage } from "./pages/WasteManagementPage"
import { LeftoverSuggestionsPage } from "./pages/LeftoverSuggestionsPage"
import { AnalyticsPage } from "./pages/AnalyticsPage"
import { SettingsPage } from "./pages/SettingsPage"
import { LoginPage } from "./pages/LoginPage"

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center text-stone-600 text-sm">
        <div className="w-6 h-6 border-2 border-forest-800 border-t-transparent rounded-full animate-spin mr-3" />
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
            {/* 1. Dashboard */}
            <Route index element={<DashboardPage />} />

            {/* 2. Sales Management */}
            <Route path="sales" element={<SalesPage />} />

            {/* 3. Menu Management */}
            <Route path="menu" element={<MenuPage />} />

            {/* 4. Recipe Management */}
            <Route path="recipes" element={<RecipePage />} />

            {/* 5. AI Demand Forecasting */}
            <Route path="forecast" element={<ForecastPage />} />

            {/* 6. Inventory Management */}
            <Route path="inventory" element={<InventoryPage />} />

            {/* 7. Purchase Planner */}
            <Route path="purchase-planner" element={<PurchasePlannerPage />} />
            <Route path="procurement" element={<Navigate to="/purchase-planner" replace />} />

            {/* 8. Food Waste Management */}
            <Route path="waste" element={<WasteManagementPage />} />

            {/* 9. AI Recipe Suggestions */}
            <Route path="ai-recipes" element={<LeftoverSuggestionsPage />} />
            <Route path="leftover-recipes" element={<Navigate to="/ai-recipes" replace />} />
            <Route path="expiry-alerts" element={<Navigate to="/inventory" replace />} />

            {/* 10. Analytics & Reports */}
            <Route path="analytics" element={<AnalyticsPage />} />

            {/* 11. Settings */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
