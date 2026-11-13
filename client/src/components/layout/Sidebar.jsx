import React from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  PackageCheck,
  Boxes,
  TrendingUp,
  ShoppingCart,
  Trash2,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  X,
  ChefHat
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/menu", label: "Menu & Recipes", icon: UtensilsCrossed },
  { to: "/inventory?tab=ingredients", label: "Ingredients", icon: PackageCheck },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/forecast", label: "Demand Forecast", icon: TrendingUp },
  { to: "/purchase-planner", label: "Purchase Planning", icon: ShoppingCart },
  { to: "/waste", label: "Waste Management", icon: Trash2 },
  { to: "/waste?tab=expiry", label: "Expiry Alerts", icon: AlertTriangle, badge: "3" },
  { to: "/analytics", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
]

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-forest-950 dark:bg-stone-900 text-stone-200 border-r border-forest-900/70 dark:border-stone-800 flex flex-col h-screen transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-5 border-b border-forest-900/70 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-900 dark:bg-stone-800 flex items-center justify-center border border-forest-800 dark:border-stone-700 text-stone-200">
              <ChefHat className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-white text-sm tracking-tight font-sans block leading-none">
                Kitchen Intel
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Commercial Kitchen OS</span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-forest-900 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Navigation
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isExact = item.to === "/"
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={isExact}
                onClick={() => {
                  if (onClose) onClose()
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-forest-900 dark:bg-stone-800 text-white font-semibold shadow-xs"
                      : "text-stone-300 hover:text-white hover:bg-forest-900/50 dark:hover:bg-stone-800/60"
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4 text-stone-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Quick Footer with User & Logout */}
        {user && (
          <div className="p-3 border-t border-forest-900/70 dark:border-stone-800 flex items-center justify-between shrink-0 mt-auto text-xs bg-forest-950/80 dark:bg-stone-900/80">
            <div className="min-w-0 pr-2">
              <div className="font-semibold text-white truncate">{user.fullName}</div>
              <div className="text-[10px] text-stone-400 truncate">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-forest-900 dark:hover:bg-stone-800 text-stone-400 hover:text-rose-400 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
