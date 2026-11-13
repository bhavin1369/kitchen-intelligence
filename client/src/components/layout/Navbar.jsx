import React, { useState, useEffect } from "react"
import { Bell, Activity, Sparkles, Menu, ShieldCheck, Check, Clock, ChevronDown } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { importantAlerts } from "../../data/mockData"
import { Link } from "react-router-dom"

export const Navbar = ({ onToggleSidebar }) => {
  const { user } = useAuth()
  const [now, setNow] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-16 border-b border-warm-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 font-sans">
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Mobile Hamburger */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-forest-900 hover:bg-warm-100 transition"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Location / Kitchen Title */}
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-forest-600 animate-pulse" />
          <h2 className="text-sm font-bold text-stone-900 tracking-tight">
            SpiceCraft Kitchen & Dining
          </h2>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-forest-50 text-forest-800 border border-forest-200">
            Main Kitchen Terminal #1
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Live Clock */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-stone-600 bg-warm-100/80 px-2.5 py-1.5 rounded-lg border border-warm-200 font-mono">
          <Clock className="w-3.5 h-3.5 text-stone-500" />
          <span>{now}</span>
        </div>

        {/* Engine Status */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-stone-600 bg-forest-50/70 border border-forest-100 px-2.5 py-1.5 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-forest-700" />
          <span className="font-medium text-forest-900">AI Demand Engine:</span>
          <span className="font-semibold text-forest-700">Active</span>
        </div>

        {/* Alerts Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="relative p-2 rounded-lg bg-warm-50 hover:bg-warm-100 border border-warm-200 text-stone-700 hover:text-forest-900 transition cursor-pointer"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-warm-200 rounded-xl shadow-xl p-3 z-50 text-stone-800 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-warm-100">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs text-stone-900">Operational Alerts</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    {importantAlerts.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-[11px] text-stone-500 hover:text-stone-800"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {importantAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-2.5 rounded-lg text-xs border ${
                      alt.level === "critical"
                        ? "bg-rose-50/70 border-rose-200 text-rose-900"
                        : alt.level === "warning"
                        ? "bg-amber-50/70 border-amber-200 text-amber-900"
                        : "bg-blue-50/70 border-blue-200 text-blue-900"
                    }`}
                  >
                    <div className="font-semibold">{alt.title}</div>
                    <div className="text-[11px] text-stone-600 mt-0.5">{alt.message}</div>
                    <Link
                      to={alt.link}
                      onClick={() => setShowAlertsDropdown(false)}
                      className="inline-block mt-1.5 text-[11px] font-semibold text-forest-800 hover:underline"
                    >
                      {alt.action} →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current User Pill */}
        {user && (
          <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-warm-200">
            <div className="w-8 h-8 rounded-full bg-forest-900 text-gold-400 font-bold text-xs flex items-center justify-center">
              {user.fullName ? user.fullName[0] : "V"}
            </div>
            <div className="text-left text-xs leading-tight">
              <div className="font-semibold text-stone-900">{user.fullName}</div>
              <div className="text-[10px] text-stone-500">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
