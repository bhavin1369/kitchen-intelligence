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
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Executive Kitchen Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
              Live Shift
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Real-time operations, demand forecasting, FEFO inventory tracking, and waste reduction.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/purchase-planner"
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition"
          >
            Review Purchase Orders
          </Link>
          <Link
            to="/sales"
            className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium shadow-xs transition"
          >
            + New POS Order
          </Link>
        </div>
      </div>

      {/* Operational Alerts Strip */}
      {importantAlerts.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Operational Alerts ({importantAlerts.length})
              </h2>
            </div>
            <span className="text-[11px] text-stone-500 font-normal">Automated FEFO Sentinel</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {importantAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-md bg-stone-50/70 border border-stone-200 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                        alert.level === "critical"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : alert.level === "warning"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {alert.level}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">{alert.id}</span>
                  </div>
                  <h3 className="font-semibold text-stone-900 mt-2">{alert.title}</h3>
                  <p className="text-[11px] text-stone-600 mt-0.5 line-clamp-2">{alert.message}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-200/60">
                  <Link
                    to={alert.link}
                    className="text-xs font-medium text-forest-900 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>{alert.action}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unified 6-Metric KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Today's Total Sales */}
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Today's Sales
          </div>
          <div className="text-2xl font-semibold text-stone-900 tracking-tight mt-1.5 font-sans">
            ₹{dashboardSummary.todaySales.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center text-[11px] font-medium text-emerald-700 mt-1">
            <ArrowUpRight className="w-3 h-3 mr-0.5" />
            <span>+{dashboardSummary.salesGrowth}% vs avg</span>
          </div>
        </div>

        {/* 2. Predicted Orders */}
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Predicted Demand
          </div>
          <div className="text-2xl font-semibold text-stone-900 tracking-tight mt-1.5 font-sans">
            {dashboardSummary.predictedOrders}
            <span className="text-xs font-normal text-stone-500 ml-1">orders</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 truncate">
            {dashboardSummary.predictedOrderRange} (95% CI)
          </div>
        </div>

        {/* 3. Total Inventory Value */}
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Inventory Value
          </div>
          <div className="text-2xl font-semibold text-stone-900 tracking-tight mt-1.5 font-sans">
            ₹{dashboardSummary.totalInventoryValue.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {dashboardSummary.inventoryItemsCount} Ingredients tracked
          </div>
        </div>

        {/* 4. Low-Stock Ingredients */}
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Low-Stock Items
          </div>
          <div className="text-2xl font-semibold text-amber-800 tracking-tight mt-1.5 font-sans">
            {dashboardSummary.lowStockCount}
            <span className="text-xs font-normal text-stone-500 ml-1">items</span>
          </div>
          <div className="text-[11px] font-medium text-amber-800 mt-1">
            Below Par Reorder Point
          </div>
        </div>

        {/* 5. Near-Expiry Ingredients */}
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Near Expiry (&le;48h)
          </div>
          <div className="text-2xl font-semibold text-rose-700 tracking-tight mt-1.5 font-sans">
            {dashboardSummary.nearExpiryCount}
            <span className="text-xs font-normal text-stone-500 ml-1">batches</span>
          </div>
          <div className="text-[11px] font-medium text-rose-700 mt-1">
            ₹{dashboardSummary.nearExpiryLossRisk} at risk
          </div>
        </div>

        {/* 6. Estimated Waste Cost */}
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Estimated Waste
          </div>
          <div className="text-2xl font-semibold text-stone-900 tracking-tight mt-1.5 font-sans">
            ₹{dashboardSummary.estimatedWasteCost.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center text-[11px] font-medium text-emerald-700 mt-1">
            <ArrowDownRight className="w-3 h-3 mr-0.5" />
            <span>-{dashboardSummary.wasteCostReduction}% this week</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Hourly Sales Velocity */}
        <div className="p-5 rounded-lg bg-white border border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Hourly Sales Velocity</h2>
              <p className="text-xs text-stone-500">
                Today's hourly turnover compared against 30-day baseline average
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-stone-800 font-medium">
                <span className="w-2 h-2 rounded-full bg-forest-800 inline-block" />
                <span>Today (₹)</span>
              </span>
              <span className="flex items-center space-x-1.5 text-stone-400">
                <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
                <span>Baseline Avg</span>
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" vertical={false} />
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
                    borderRadius: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                    fontSize: "12px"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="average"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  fill="none"
                  strokeWidth={1.5}
                  name="Baseline Avg"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#166534"
                  fill="#166534"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  name="Today Actual"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actual vs Predicted Demand */}
        <div className="p-5 rounded-lg bg-white border border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Actual vs AI Predicted Demand</h2>
              <p className="text-xs text-stone-500">
                Portion demand comparison across shift days
              </p>
            </div>
            <span className="text-[11px] font-mono text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
              MAE: ±3.2 portions
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" vertical={false} />
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
                    borderRadius: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                    fontSize: "12px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="actual" fill="#166534" name="Actual Orders" radius={[3, 3, 0, 0]} />
                <Bar dataKey="predicted" fill="#d97706" name="AI Forecast" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Stream & Context Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Activities Timeline */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
            <div>
              <h2 className="text-sm font-semibold text-stone-900">Recent Operational Activities</h2>
              <p className="text-xs text-stone-500">Event feed from POS, batch audits, and AI schedules</p>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">Audit Trail</span>
          </div>

          <div className="divide-y divide-stone-100">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-2.5 flex items-start space-x-3 text-xs">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium font-mono uppercase shrink-0 mt-0.5 ${
                    act.severity === "danger"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : act.severity === "warning"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-stone-100 text-stone-700 border border-stone-200"
                  }`}
                >
                  {act.type}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-stone-900">{act.title}</span>
                    <span className="text-[10px] text-stone-400 font-mono">{act.time}</span>
                  </div>
                  <p className="text-stone-600 text-[11px] mt-0.5">{act.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Recommendations & Upcoming Festival Factors */}
        <div className="space-y-4">
          <div className="p-5 rounded-lg bg-white border border-stone-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Leftover Upcycling Suggestion
            </h2>
            <div className="p-3 rounded-md bg-stone-50 border border-stone-200">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                Surplus Action
              </span>
              <h3 className="font-semibold text-xs text-stone-900 mt-2">
                Paneer Tikka Kathi Roll Special
              </h3>
              <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                Upcycles 4.5 kg near-expiry paneer into 35 high-margin specials. Projected gross revenue: ₹4,550.
              </p>
              <Link
                to="/ai-recipes"
                className="inline-flex items-center space-x-1 mt-2.5 text-xs font-medium text-forest-900 hover:underline"
              >
                <span>Inspect Recipe & Push to POS</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-white border border-stone-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Indian Calendar Factor
            </h2>
            <div className="p-3 rounded-md bg-stone-50 border border-stone-200">
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-200/60 text-stone-800">
                  Upcoming Festival
                </span>
                <span className="text-[11px] font-mono text-stone-500">+35% Multiplier</span>
              </div>
              <h3 className="font-semibold text-xs text-stone-900 mt-2">Diwali Festival Season</h3>
              <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                Demand model projects spike on Desserts, Biryani and Starters. Purchase planner has pre-buffered ghee and staples.
              </p>
              <Link
                to="/forecast"
                className="inline-flex items-center space-x-1 mt-2.5 text-xs font-medium text-forest-900 hover:underline"
              >
                <span>View Demand Forecasts</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
