import React, { useState } from "react"
import {
  Settings,
  Building2,
  Cpu,
  Calendar,
  Users,
  Database,
  Save,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  RotateCcw
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { indianCalendarEvents } from "../data/mockData"

export const SettingsPage = () => {
  const { user, switchRole } = useAuth()
  const [activeTab, setActiveTab] = useState("restaurant")
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Restaurant profile states
  const [restaurantName, setRestaurantName] = useState("SpiceCraft Kitchen & Dining")
  const [city, setCity] = useState("Hyderabad, Telangana")
  const [taxRate, setTaxRate] = useState(5)
  const [currency, setCurrency] = useState("INR (₹)")

  // AI settings
  const [safetyBuffer, setSafetyBuffer] = useState(15)
  const [fefoAlertWindow, setFefoAlertWindow] = useState(48)
  const [autoDraftPOs, setAutoDraftPOs] = useState(true)

  // Calendar multipliers
  const [events, setEvents] = useState(indianCalendarEvents)

  const handleSave = (e) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const handleToggleEvent = (id) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === id ? { ...evt, isActive: !evt.isActive } : evt))
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            System Settings & Operations Configuration
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Configure restaurant parameters, AI safety thresholds, calendar multipliers, and staff access roles.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4 text-gold-400" />
          <span>Save Changes</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
          <span>Configuration saved successfully! Operational thresholds updated.</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center space-x-2 border-b border-warm-200 pb-1 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("restaurant")}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === "restaurant"
              ? "bg-forest-900 text-gold-400 shadow-sm"
              : "text-stone-600 hover:bg-warm-100"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Restaurant Profile</span>
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === "ai"
              ? "bg-forest-900 text-gold-400 shadow-sm"
              : "text-stone-600 hover:bg-warm-100"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>AI & Safety Buffers</span>
        </button>

        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === "calendar"
              ? "bg-forest-900 text-gold-400 shadow-sm"
              : "text-stone-600 hover:bg-warm-100"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Festival & Event Multipliers</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
            activeTab === "users"
              ? "bg-forest-900 text-gold-400 shadow-sm"
              : "text-stone-600 hover:bg-warm-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kitchen Staff & Roles</span>
        </button>
      </div>

      {/* Tab 1: Restaurant Profile */}
      {activeTab === "restaurant" && (
        <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4 max-w-2xl text-xs">
          <h3 className="font-bold text-sm text-stone-900">Establishment Profile</h3>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-stone-600 mb-1">Restaurant Trade Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 font-semibold text-stone-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-600 mb-1">City / Region</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Currency Standard</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                >
                  <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                  <option value="USD ($)">US Dollar ($)</option>
                  <option value="AED (د.إ)">UAE Dirham (AED)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Standard GST Tax Rate (%)</label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">POS Terminal ID</label>
                <input
                  type="text"
                  disabled
                  value="TERM-HYD-01"
                  className="w-full px-3 py-2 rounded-lg bg-warm-100 border border-warm-200 text-stone-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI & Safety Buffers */}
      {activeTab === "ai" && (
        <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-5 max-w-2xl text-xs">
          <div className="flex items-center space-x-2 text-forest-900 font-bold text-sm">
            <Cpu className="w-4 h-4 text-forest-700" />
            <span>AI Predictive Engine Thresholds</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-stone-700">Safety Par Stock Buffer:</span>
                <span className="text-forest-900 font-bold">{safetyBuffer}% extra stock</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={safetyBuffer}
                onChange={(e) => setSafetyBuffer(Number(e.target.value))}
                className="w-full accent-forest-900"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                AI adds this percentage buffer over expected forecast demand to prevent stockouts during unexpected peak rushes.
              </p>
            </div>

            <div className="pt-3 border-t border-warm-100">
              <label className="block font-semibold text-stone-700 mb-1">FEFO Expiry Alert Trigger</label>
              <select
                value={fefoAlertWindow}
                onChange={(e) => setFefoAlertWindow(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
              >
                <option value={24}>24 Hours before expiration</option>
                <option value={48}>48 Hours before expiration (Recommended)</option>
                <option value={72}>72 Hours before expiration</option>
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                Batches expiring within this window trigger high-priority alerts and AI leftover upcycling specials.
              </p>
            </div>

            <div className="pt-3 border-t border-warm-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-stone-800">Auto-Generate Supplier Purchase Orders</span>
                <p className="text-[11px] text-stone-500">
                  When stock falls below reorder points, automatically prepare draft POs grouped by vendor.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoDraftPOs}
                onChange={(e) => setAutoDraftPOs(e.target.checked)}
                className="w-4 h-4 accent-forest-900 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Calendar Multipliers */}
      {activeTab === "calendar" && (
        <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-sm text-stone-900">Indian Festive & Seasonal Multipliers</h3>
            <p className="text-stone-500">
              The AI incorporates these holiday weights into the ridge demand regression model.
            </p>
          </div>

          <div className="divide-y divide-warm-100">
            {events.map((evt) => (
              <div key={evt.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900 text-sm">{evt.name}</div>
                  <div className="text-stone-500 text-[11px]">
                    {evt.dateRange} • Affects: {evt.categoryImpact}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-xs bg-gold-50 text-gold-800 px-2.5 py-1 rounded-md border border-gold-200">
                    +{Math.round((evt.multiplier - 1) * 100)}% ({evt.multiplier}x)
                  </span>
                  <button
                    onClick={() => handleToggleEvent(evt.id)}
                    className="cursor-pointer text-xs font-semibold px-3 py-1 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700"
                  >
                    Active
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Kitchen Staff & Roles */}
      {activeTab === "users" && (
        <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-sm text-stone-900">Kitchen Staff & Permission Roles</h3>
            <p className="text-stone-500">
              Switch role profile to simulate different permission views.
            </p>
          </div>

          <div className="divide-y divide-warm-100 border border-warm-200 rounded-xl overflow-hidden">
            {[
              { id: 1, name: "Vikram Sharma", role: "Head Chef", email: "chef.vikram@spicecraft.com" },
              { id: 2, name: "Ananya Iyer", role: "Kitchen Manager", email: "ananya.iyer@spicecraft.com" },
              { id: 3, name: "Rahul Mehta", role: "Inventory Clerk", email: "rahul.mehta@spicecraft.com" },
              { id: 4, name: "Priya Rao", role: "POS Cashier", email: "priya.rao@spicecraft.com" },
            ].map((staff) => (
              <div key={staff.id} className="p-3.5 flex items-center justify-between hover:bg-warm-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-forest-900 text-gold-400 font-bold flex items-center justify-center">
                    {staff.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900">{staff.name}</div>
                    <div className="text-[11px] text-stone-500">{staff.email}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warm-100 text-stone-800 border border-warm-200">
                    {staff.role}
                  </span>
                  <button
                    onClick={() => switchRole(staff.role, staff.name)}
                    className="px-2.5 py-1 rounded bg-forest-900 hover:bg-forest-950 text-white font-semibold transition"
                  >
                    Act As User
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
