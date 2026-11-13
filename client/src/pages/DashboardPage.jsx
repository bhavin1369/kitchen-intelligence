import React, { useState } from "react"
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  Trash2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  ShieldAlert,
  ShoppingCart,
  Calendar,
  Layers,
  ChefHat,
  Info
} from "lucide-react"
import { Link } from "react-router-dom"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"

import {
  dashboardSummary,
  hourlySalesTrend,
  demandComparison,
  recentActivities,
  importantAlerts
} from "../data/mockData"

export const DashboardPage = () => {
  const [activeRange, setActiveRange] = useState("today")

  return (
    <div className="space-y-6">
      {/* Page Title & Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Executive Kitchen Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gold-100 text-gold-800 border border-gold-300">
              Live Shift
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Real-time operations, closed-loop demand predictions, FEFO stock alerts, and waste reduction.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/sales"
            className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-1.5"
          >
            <Receipt className="w-3.5 h-3.5 text-gold-400" />
            <span>+ New POS Order</span>
          </Link>
          <Link
            to="/purchase-planner"
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-warm-100 border border-warm-300 text-stone-700 text-xs font-semibold transition flex items-center space-x-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-forest-700" />
            <span>Generate POs</span>
          </Link>
        </div>
      </div>

      {/* Important Alerts Banner (Component #10) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Critical Operational Alerts ({importantAlerts.length})</span>
          </h2>
          <span className="text-xs text-stone-400 font-medium">Automatic FEFO Sentinel</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {importantAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.level === "critical"
                  ? "bg-rose-50/70 border-rose-200 text-rose-950"
                  : alert.level === "warning"
                  ? "bg-amber-50/70 border-amber-200 text-amber-950"
                  : "bg-emerald-50/60 border-emerald-200 text-emerald-950"
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    alert.level === "critical"
                      ? "bg-rose-600 text-white"
                      : alert.level === "warning"
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {alert.level}
                </span>
                <span className="text-[10px] font-mono text-stone-500">{alert.id}</span>
              </div>

              <h3 className="font-bold text-sm mt-2">{alert.title}</h3>
              <p className="text-xs text-stone-600 mt-1 line-clamp-2">{alert.message}</p>

              <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between">
                <Link
                  to={alert.link}
                  className="text-xs font-bold text-forest-900 hover:text-forest-700 inline-flex items-center space-x-1 group"
                >
                  <span>{alert.action}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 6 KPI Cards (Components #1, #2, #3, #4, #5, #6) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Today's Total Sales */}
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Today's Sales</span>
            <div className="p-1.5 rounded-lg bg-forest-50 text-forest-800">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-forest-900">
              ₹{dashboardSummary.todaySales.toLocaleString("en-IN")}
            </div>
            <div className="flex items-center text-[11px] font-semibold text-emerald-700 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              <span>+{dashboardSummary.salesGrowth}% vs avg</span>
            </div>
          </div>
        </div>

        {/* 2. Predicted Orders */}
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Predicted Orders</span>
            <div className="p-1.5 rounded-lg bg-gold-50 text-gold-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-stone-900">
              {dashboardSummary.predictedOrders}{" "}
              <span className="text-xs font-normal text-stone-500">orders</span>
            </div>
            <div className="text-[11px] text-stone-500 mt-1">
              Confidence: {dashboardSummary.predictedOrderRange}
            </div>
          </div>
        </div>

        {/* 3. Total Inventory Value */}
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Inventory Value</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-stone-900">
              ₹{dashboardSummary.totalInventoryValue.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-stone-500 mt-1">
              {dashboardSummary.inventoryItemsCount} Tracked Ingredients
            </div>
          </div>
        </div>

        {/* 4. Low-Stock Ingredients */}
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Low-Stock Items</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-amber-700">
              {dashboardSummary.lowStockCount}{" "}
              <span className="text-xs font-normal text-stone-500">items</span>
            </div>
            <div className="text-[11px] font-medium text-amber-800 mt-1">
              Below Safety Par Level
            </div>
          </div>
        </div>

        {/* 5. Near-Expiry Ingredients */}
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Near Expiry</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-rose-600">
              {dashboardSummary.nearExpiryCount}{" "}
              <span className="text-xs font-normal text-stone-500">batches</span>
            </div>
            <div className="text-[11px] font-medium text-rose-700 mt-1">
              ₹{dashboardSummary.nearExpiryLossRisk} at Risk (&lt;48h)
            </div>
          </div>
        </div>

        {/* 6. Estimated Waste Cost */}
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card hover:shadow-card-hover transition">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Waste Cost</span>
            <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold text-stone-900">
              ₹{dashboardSummary.estimatedWasteCost.toLocaleString("en-IN")}
            </div>
            <div className="flex items-center text-[11px] font-semibold text-emerald-700 mt-1">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              <span>-{dashboardSummary.wasteCostReduction}% this week</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid (Components #7 & #8) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component #7: Sales Trend Chart */}
        <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Hourly Sales Velocity</h2>
              <p className="text-xs text-stone-500">
                Today's hourly turnover compared to the 30-day baseline average
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center space-x-1 text-forest-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-forest-700 inline-block" />
                <span>Today (₹)</span>
              </span>
              <span className="flex items-center space-x-1 text-stone-400">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-300 inline-block" />
                <span>Baseline Avg</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" />
                <XAxis dataKey="time" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#78716c"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val) => [`₹${val.toLocaleString()}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e7e5e4",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="average"
                  stroke="#d6d3d1"
                  strokeDasharray="4 4"
                  fill="none"
                  strokeWidth={2}
                  name="Baseline Avg"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#166534"
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                  strokeWidth={2.5}
                  name="Today Actual"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Component #8: Actual vs Predicted Demand Chart */}
        <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Actual vs AI Predicted Demand</h2>
              <p className="text-xs text-stone-500">
                Covers past 7 days plus next 7-day forecast with confidence interval
              </p>
            </div>
            <span className="text-[11px] font-semibold text-gold-700 bg-gold-50 border border-gold-200 px-2 py-0.5 rounded">
              MAE: ±3.2 portions
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" />
                <XAxis dataKey="day" stroke="#78716c" fontSize={10} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [
                    val ? `${val} portions` : "Forecast Pending",
                    name === "actual" ? "Actual Orders" : name === "predicted" ? "AI Predicted" : "Baseline"
                  ]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e7e5e4",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="actual" fill="#15803d" name="Actual Orders" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predicted" fill="#f59e0b" name="AI Forecast" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Component #9 Recent Activities & Quick Operational Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component #9: Recent Activities Timeline */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Recent Operational Activities</h2>
              <p className="text-xs text-stone-500">Live event stream from POS, FEFO batch audits, and AI jobs</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-forest-50 text-forest-800 border border-forest-200">
              Live Stream
            </span>
          </div>

          <div className="divide-y divide-warm-100">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-start space-x-3 text-xs">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    act.severity === "danger"
                      ? "bg-rose-100 text-rose-700"
                      : act.severity === "warning"
                      ? "bg-amber-100 text-amber-800"
                      : act.severity === "gold"
                      ? "bg-gold-100 text-gold-700"
                      : "bg-forest-100 text-forest-800"
                  }`}
                >
                  {act.type === "order" ? (
                    <Receipt className="w-3.5 h-3.5" />
                  ) : act.type === "alert" ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : act.type === "procurement" ? (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  ) : act.type === "waste" ? (
                    <Trash2 className="w-3.5 h-3.5" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900">{act.title}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{act.time}</span>
                  </div>
                  <p className="text-stone-600 text-[11px] mt-0.5">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Decision Shortcuts & Indian Events Widget */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card">
            <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-gold-600" />
              <span>AI Upcycling Recommendations</span>
            </h2>
            <div className="p-3.5 rounded-xl bg-gold-50/70 border border-gold-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800">
                Urgent Recommendation
              </span>
              <h3 className="font-bold text-xs text-stone-900 mt-1">
                Paneer Tikka Kathi Roll Special
              </h3>
              <p className="text-[11px] text-stone-600 mt-1">
                Upcycles 4.5 kg near-expiry paneer into 35 high-margin specials. Projected revenue: ₹4,550.
              </p>
              <Link
                to="/ai-recipes"
                className="inline-block mt-2.5 text-xs font-bold text-forest-900 hover:text-forest-700 underline"
              >
                Inspect Recipe & Push to POS →
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-forest-900 text-stone-200 shadow-card border border-forest-800">
            <div className="flex items-center space-x-2 text-gold-400 text-xs font-semibold mb-2">
              <Calendar className="w-4 h-4" />
              <span>Upcoming Holiday Factor</span>
            </div>
            <h3 className="text-base font-bold text-white">Diwali Festival Season</h3>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              AI model is projecting a <strong>+35% demand spike</strong> on Desserts, Biryani and Starters.
              Purchase planner has pre-buffered ghee, dry fruits, and basmati rice.
            </p>
            <div className="mt-4 pt-3 border-t border-forest-800 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">Factor: 1.35x multiplier</span>
              <Link
                to="/forecast"
                className="text-xs font-semibold text-gold-400 hover:text-gold-300 flex items-center space-x-1"
              >
                <span>View Forecast</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
