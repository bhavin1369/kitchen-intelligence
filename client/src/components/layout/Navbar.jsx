import React, { useState } from "react"
import { Bell, Menu, ChevronRight, Sun, Moon, User, LogOut, Check, ChefHat } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { importantAlerts } from "../../data/mockData"
import { Link, useLocation } from "react-router-dom"

const PAGE_TITLES = {
  "/": "Dashboard",
  "/daily-plan": "Daily Action Plan",
  "/sales": "Sales Management",
  "/menu": "Menu & Recipes",
  "/recipes": "Recipe BOM",
  "/forecast": "Demand Forecast",
  "/inventory": "Inventory Management",
  "/purchase-planner": "Purchase Planning",
  "/waste": "Waste Management",
  "/ai-recipes": "Leftover Suggestions",
  "/environmental": "Environmental Impact",
  "/analytics": "Executive Reports",
  "/settings": "System Settings"
}

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, switchRole } = useAuth()
  const { theme, setTheme, toggleTheme, isDark } = useTheme()
  const location = useLocation()
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const currentPageTitle = PAGE_TITLES[location.pathname] || "Dashboard"

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date())

  return (
    <header className="h-14 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 font-sans transition-colors duration-150">
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Current Page Title & Location Breadcrumb */}
        <div className="flex items-center space-x-2.5 truncate">
          <div className="hidden sm:flex items-center space-x-1.5 text-stone-400 dark:text-stone-500 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span className="font-medium text-stone-700 dark:text-stone-300">SpiceCraft</span>
            <span>/</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight truncate">
            {currentPageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Shift Date */}
        <div className="hidden md:flex items-center text-xs text-stone-500 dark:text-stone-400 font-medium">
          <span>{todayFormatted}</span>
        </div>

        {/* Theme Switcher Segmented Control */}
        <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`px-2 py-1 rounded-md flex items-center space-x-1.5 transition cursor-pointer ${
              !isDark
                ? "bg-white text-stone-900 font-semibold shadow-xs border border-stone-200/80"
                : "text-stone-400 hover:text-stone-200"
            }`}
            title="Switch to Light Theme"
            aria-label="Light Theme"
          >
            <Sun className={`w-3.5 h-3.5 ${!isDark ? "text-amber-500 fill-amber-500/20" : "text-stone-400"}`} />
            <span className="hidden sm:inline text-[11px]">Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`px-2 py-1 rounded-md flex items-center space-x-1.5 transition cursor-pointer ${
              isDark
                ? "bg-stone-700 text-stone-100 font-semibold shadow-xs border border-stone-600/80"
                : "text-stone-500 hover:text-stone-800"
            }`}
            title="Switch to Dark Theme"
            aria-label="Dark Theme"
          >
            <Moon className={`w-3.5 h-3.5 ${isDark ? "text-amber-300 fill-amber-300/20" : "text-stone-500"}`} />
            <span className="hidden sm:inline text-[11px]">Dark</span>
          </button>
        </div>

        {/* Alerts Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAlertsDropdown(!showAlertsDropdown)
              setShowProfileDropdown(false)
            }}
            className="relative p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white transition cursor-pointer"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {importantAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl p-3 z-50 text-stone-800 dark:text-stone-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">Operational Alerts</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                    {importantAlerts.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {importantAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-2.5 rounded-md text-xs border ${
                      alt.level === "critical"
                        ? "bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200"
                        : alt.level === "warning"
                        ? "bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200"
                        : "bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-200"
                    }`}
                  >
                    <div className="font-semibold">{alt.title}</div>
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">{alt.message}</div>
                    <Link
                      to={alt.link}
                      onClick={() => setShowAlertsDropdown(false)}
                      className="inline-flex items-center space-x-1 mt-1.5 text-[11px] font-medium text-forest-700 dark:text-emerald-400 hover:underline"
                    >
                      <span>{alt.action}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        {user && (
          <div className="relative pl-1 sm:pl-2 border-l border-stone-200 dark:border-stone-800">
            <button
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown)
                setShowAlertsDropdown(false)
              }}
              className="flex items-center space-x-2 p-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-semibold text-xs flex items-center justify-center">
                {user.fullName ? user.fullName[0].toUpperCase() : "V"}
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight">
                <div className="font-medium text-stone-900 dark:text-stone-100 truncate max-w-[120px]">{user.fullName}</div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400">{user.role}</div>
              </div>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl p-2 z-50 text-xs">
                <div className="p-2 border-b border-stone-100 dark:border-stone-800 mb-1">
                  <div className="font-semibold text-stone-900 dark:text-stone-100">{user.fullName}</div>
                  <div className="text-stone-500 dark:text-stone-400 text-[11px] truncate">{user.email || user.username}</div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    Role: {user.role}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    <span>Kitchen Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false)
                      logout()
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
