import React from "react"
import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  ChefHat,
  TrendingUp,
  Boxes,
  ShoppingCart,
  Trash2,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  X,
  ClipboardCheck,
  Leaf
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/daily-plan", label: "Daily Action Plan", icon: ClipboardCheck },
  { to: "/sales", label: "Sales & POS", icon: Receipt },
  { to: "/menu", label: "Menu Catalog", icon: UtensilsCrossed },
  { to: "/recipes", label: "Recipe BOM", icon: ChefHat },
  { to: "/forecast", label: "Demand Forecasting", icon: TrendingUp },
  { to: "/inventory", label: "Inventory & Batches", icon: Boxes, badge: "4" },
  { to: "/purchase-planner", label: "Purchase Planner", icon: ShoppingCart },
  { to: "/waste", label: "Waste Management", icon: Trash2 },
  { to: "/ai-recipes", label: "Leftover Upcycling", icon: Sparkles, badge: "3" },
  { to: "/environmental", label: "Eco Impact", icon: Leaf },
  { to: "/analytics", label: "Analytics & Reports", icon: BarChart3 },
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
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-forest-950 text-stone-200 border-r border-forest-900/80 flex flex-col h-screen transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-forest-900 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-900 flex items-center justify-center border border-forest-800 text-stone-200">
              <ChefHat className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="font-semibold text-white text-sm tracking-tight font-sans block leading-none">
                Kitchen Intel
              </span>
              <span className="text-[11px] text-stone-400 font-normal">SpiceCraft Operations</span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-stone-400 hover:text-white hover:bg-forest-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Operations</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5 custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => {
                  if (onClose) onClose()
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-forest-900 text-white font-semibold"
                      : "text-stone-300 hover:text-white hover:bg-forest-900/50"
                  }`
                }
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 text-stone-400" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-forest-900 text-stone-300 border border-forest-800">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Footer Profile */}
        {user && (
          <div className="p-3 border-t border-forest-900 bg-forest-950">
            <div className="flex items-center justify-between p-2 rounded-lg bg-forest-900/60 border border-forest-800">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-forest-800 border border-forest-700 text-emerald-300 flex items-center justify-center font-semibold text-xs shrink-0">
                  {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : "CK"}
                </div>
                <div className="truncate min-w-0">
                  <p className="text-xs font-medium text-stone-100 truncate">{user.fullName || user.username}</p>
                  <p className="text-[10px] text-stone-400 truncate">{user.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded text-stone-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
