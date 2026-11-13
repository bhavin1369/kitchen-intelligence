import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
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
import { ActionPlanPage } from "./pages/ActionPlanPage"
import { EnvironmentalImpactPage } from "./pages/EnvironmentalImpactPage"
import { LoginPage } from "./pages/LoginPage"

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-6 text-stone-900 dark:text-stone-100">
          <div className="max-w-md w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg">
              !
            </div>
            <div>
              <h2 className="text-base font-bold">Something went wrong</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                An unexpected UI error occurred while rendering the kitchen workspace.
              </p>
            </div>
            {this.state.error && (
              <pre className="p-3 rounded-md bg-stone-100 dark:bg-stone-800 text-[11px] font-mono text-left text-rose-700 dark:text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <ThemeProvider>
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

            {/* Daily Action Plan */}
            <Route path="daily-plan" element={<ActionPlanPage />} />
            <Route path="action-plan" element={<Navigate to="/daily-plan" replace />} />

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

            {/* Environmental Impact Tracker */}
            <Route path="environmental" element={<EnvironmentalImpactPage />} />
            <Route path="eco" element={<Navigate to="/environmental" replace />} />

            {/* 10. Analytics & Reports */}
            <Route path="analytics" element={<AnalyticsPage />} />

            {/* 11. Settings */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
