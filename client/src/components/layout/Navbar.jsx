import React, { useState } from "react"
import { Bell, Menu, ChevronRight } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { importantAlerts } from "../../data/mockData"
import { Link } from "react-router-dom"

export const Navbar = ({ onToggleSidebar }) => {
  const { user } = useAuth()
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false)

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date())

  return (
    <header className="h-14 border-b border-stone-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 font-sans">
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Location / Kitchen Title */}
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight">
            SpiceCraft Kitchen & Dining
          </h2>
          <span className="hidden md:inline-block text-xs text-stone-400">/</span>
          <span className="hidden md:inline-block text-xs text-stone-500 font-normal">
            Terminal #1
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Operational Shift Date */}
        <div className="hidden md:flex items-center text-xs text-stone-500 font-medium">
          <span>{todayFormatted}</span>
        </div>

        {/* Engine Status */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span className="font-medium text-stone-700">AI Engine Online</span>
        </div>

        {/* Alerts Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="relative p-1.5 rounded-md hover:bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 transition cursor-pointer"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {importantAlerts.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-stone-200 rounded-lg shadow-lg p-3 z-50 text-stone-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-stone-900">Operational Alerts</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    {importantAlerts.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
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
                        ? "bg-rose-50/50 border-rose-200 text-rose-950"
                        : alt.level === "warning"
                        ? "bg-amber-50/50 border-amber-200 text-amber-950"
                        : "bg-stone-50 border-stone-200 text-stone-900"
                    }`}
                  >
                    <div className="font-semibold">{alt.title}</div>
                    <div className="text-[11px] text-stone-600 mt-0.5">{alt.message}</div>
                    <Link
                      to={alt.link}
                      onClick={() => setShowAlertsDropdown(false)}
                      className="inline-flex items-center space-x-1 mt-1.5 text-[11px] font-medium text-forest-900 hover:underline"
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

        {/* Current User Pill */}
        {user && (
          <div className="flex items-center space-x-2 pl-2 border-l border-stone-200">
            <div className="w-7 h-7 rounded-md bg-stone-900 text-stone-100 font-semibold text-xs flex items-center justify-center">
              {user.fullName ? user.fullName[0].toUpperCase() : "V"}
            </div>
            <div className="hidden sm:block text-left text-xs leading-tight">
              <div className="font-medium text-stone-900">{user.fullName}</div>
              <div className="text-[10px] text-stone-500">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
