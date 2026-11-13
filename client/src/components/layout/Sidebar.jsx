import React from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  TrendingUp,
  Boxes,
  Calculator,
  ShoppingCart,
  Trash2,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  ChefHat
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Sales & POS", icon: Receipt },
  { to: "/menu", label: "Menu & Recipes", icon: UtensilsCrossed },
  { to: "/forecast", label: "AI Forecasting", icon: TrendingUp },
  { to: "/inventory", label: "Smart Inventory", icon: Boxes },
  { to: "/procurement", label: "Requirements & POs", icon: ShoppingCart },
  { to: "/waste", label: "Food Waste Log", icon: Trash2 },
  { to: "/expiry-alerts", label: "Expiry Sentinel", icon: AlertTriangle, badge: "3" },
  { to: "/leftover-recipes", label: "AI Leftover Chef", icon: Sparkles },
  { to: "/analytics", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
]

export const Sidebar = () => {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ChefHat className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-sm tracking-wide">Kitchen Intelligence</h1>
          <p className="text-xs text-emerald-400 font-medium">AI Decision Support</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User Footer */}
      {user && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
                {user.username.slice(0, 2)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.username}</p>
                <span className="inline-block px-1.5 py-0.2 text-[9px] font-medium rounded bg-slate-800 text-emerald-400 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

