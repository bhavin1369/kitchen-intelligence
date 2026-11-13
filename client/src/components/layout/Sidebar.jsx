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
  Compass
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Sales Management", icon: Receipt },
  { to: "/menu", label: "Menu Management", icon: UtensilsCrossed },
  { to: "/recipes", label: "Recipe Management", icon: ChefHat },
  { to: "/forecast", label: "AI Demand Forecasting", icon: TrendingUp },
  { to: "/inventory", label: "Inventory Management", icon: Boxes, badge: "4 Low", badgeType: "amber" },
  { to: "/purchase-planner", label: "Purchase Planner", icon: ShoppingCart, badge: "4 Drafts", badgeType: "gold" },
  { to: "/waste", label: "Food Waste Log", icon: Trash2 },
  { to: "/ai-recipes", label: "AI Recipe Suggestions", icon: Sparkles, badge: "3 Surplus", badgeType: "urgent" },
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
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-forest-950 text-stone-200 border-r border-forest-900/80 flex flex-col h-screen transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-forest-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-forest-800 flex items-center justify-center border border-forest-700 shadow-md">
              <ChefHat className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-white text-base tracking-tight font-sans">Kitchen Intel</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/30">
                  AI v1.0
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium">SpiceCraft Dining System</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-forest-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Main Modules</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-1 custom-scrollbar">
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
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-forest-800 text-white font-semibold shadow-sm border-l-4 border-gold-500"
                      : "text-stone-300 hover:text-white hover:bg-forest-900/70"
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 shrink-0 text-stone-400 group-hover:text-gold-400" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      item.badgeType === "urgent"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : item.badgeType === "gold"
                        ? "bg-gold-500/20 text-gold-300 border border-gold-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User Footer Profile */}
        {user && (
          <div className="p-3 border-t border-forest-900 bg-forest-950/80">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-forest-900/60 border border-forest-800">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {user.fullName ? user.fullName.slice(0, 2) : "CK"}
                </div>
                <div className="truncate min-w-0">
                  <p className="text-xs font-semibold text-stone-100 truncate">{user.fullName || user.username}</p>
                  <p className="text-[10px] text-gold-400 font-medium truncate">{user.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
