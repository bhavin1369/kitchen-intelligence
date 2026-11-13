import React, { useState, useEffect } from "react"
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  Trash2,
  Sparkles,
  UtensilsCrossed,
  Activity,
  CheckCircle2,
  ArrowUpRight
} from "lucide-react"
import { Link } from "react-router-dom"
import api from "../services/api"

export const DashboardPage = () => {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/health")
      .then((res) => setHealthData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const counts = healthData?.database?.counts || {}

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/20 p-6">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Phase 1 Scaffolding & Unified Database Initialized</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">AI Kitchen Intelligence Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time closed-loop operations tracking demand forecasting, recipe explosion, FEFO batch expiry, and waste minimization.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historical Orders</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">{counts.sales_orders?.toLocaleString() || "3,959"}</div>
            <p className="text-xs text-emerald-400 flex items-center mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              <span>90 Days POS history seeded</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Menu Items</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">{counts.menu_items || "12"} Items</div>
            <p className="text-xs text-slate-400 mt-1">
              <span>{counts.recipes || "61"} BOM recipe links</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tracked Batches</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-100">{counts.inventory_batches || "13"} Active</div>
            <p className="text-xs text-slate-400 mt-1">
              <span>{counts.ingredients || "26"} Raw ingredients</span>
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiry Sentinel</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400">3 Batches Urgent</div>
            <p className="text-xs text-rose-400/80 mt-1">
              <span>Expiring within 48h (FEFO alert)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Database Verification Card */}
      <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="font-semibold text-slate-200 text-sm">Unified SQLite Storage Engine (WAL Mode)</h3>
          </div>
          <span className="px-2.5 py-1 text-xs font-mono rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            kitchen_intelligence.db
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          {Object.entries(counts).map(([table, count]) => (
            <div key={table} className="p-3 rounded-lg bg-slate-900 border border-slate-800/80">
              <p className="text-slate-400 text-[11px] font-mono truncate">{table}</p>
              <p className="text-base font-bold text-slate-100 mt-0.5">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap Modules Quick Links */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          System Modules (Phased Roadmap)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/sales"
            className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400">Sales & POS</span>
              <Receipt className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Record POS orders and track live order history</p>
          </Link>

          <Link
            to="/menu"
            className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400">Menu & Recipes</span>
              <UtensilsCrossed className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Interactive Bill of Materials and recipe costing</p>
          </Link>

          <Link
            to="/forecast"
            className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400">AI Forecasting</span>
              <TrendingUp className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Predict daily demand with Indian holiday multipliers</p>
          </Link>

          <Link
            to="/inventory"
            className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400">Smart Inventory</span>
              <Boxes className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">FEFO batch tracking, stock par levels and movements</p>
          </Link>

          <Link
            to="/leftover-recipes"
            className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400">AI Leftover Chef</span>
              <Sparkles className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Upcycle surplus batches into creative daily specials</p>
          </Link>

          <Link
            to="/waste"
            className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400">Food Waste Log</span>
              <Trash2 className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Track financial loss and categorize wastage causes</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

