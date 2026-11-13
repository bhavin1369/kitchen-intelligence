import React, { useState } from "react"
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart as PieIcon,
  Percent,
  CheckCircle2
} from "lucide-react"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { analyticsReport } from "../data/mockData"

const CATEGORY_COLORS = ["#166534", "#d97706", "#2563eb", "#9333ea", "#0d9488", "#ea580c"]

export const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState("30days")
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const handleExportCSV = () => {
    setDownloadSuccess(true)
    setTimeout(() => setDownloadSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Executive Analytics & Financial Reports
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-forest-100 text-forest-800 border border-forest-200">
              Audit Ready
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Track gross revenue, Food Cost COGS, margin health, waste reduction, and category sales velocity.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-gold-400" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
          <span>
            CSV Export generated: <strong>spicecraft_financial_analytics_nov2026.csv</strong> (Downloaded to your records).
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Gross Monthly Sales</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">
            ₹{analyticsReport.grossSalesMonth.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium flex items-center mt-1">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            <span>+12.4% MoM organic growth</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Cost of Goods Sold (COGS)</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            ₹{analyticsReport.cogsCostMonth.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">{analyticsReport.cogsPercent}% of gross revenue</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Gross Profit Margin</div>
          <div className="text-2xl font-bold text-gold-700 mt-2">
            {analyticsReport.grossProfitMargin}%
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">+3.2% gain via recipe optimization</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Food Waste Financial Loss</div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            ₹{analyticsReport.foodWasteTotalLoss.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium flex items-center mt-1">
            <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
            <span>1.8% of sales (Down from 3.4%)</span>
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex items-center justify-between text-xs">
        <span className="font-semibold text-stone-700">Reporting Horizon:</span>
        <div className="flex items-center space-x-2">
          {["7days", "30days", "90days", "ytd"].map((rng) => (
            <button
              key={rng}
              onClick={() => setDateRange(rng)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                dateRange === rng ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700"
              }`}
            >
              {rng === "7days"
                ? "Last 7 Days"
                : rng === "30days"
                ? "Last 30 Days"
                : rng === "90days"
                ? "Quarter (90d)"
                : "Year-To-Date"}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trend: Revenue vs COGS vs Waste */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Revenue, COGS & Waste Trend (6 Months)</h2>
              <p className="text-xs text-stone-500">Correlation between sales volume and procurement costs</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={analyticsReport.monthlyFinancials}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#78716c"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v / 1000}k`}
                />
                <Tooltip
                  formatter={(val) => [`₹${val.toLocaleString()}`, "Amount"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e7e5e4",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="revenue" fill="#166534" name="Gross Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" fill="#d97706" name="Food Cost (COGS)" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="waste"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#e11d48" }}
                  name="Waste Loss"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution Pie Chart */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-warm-200 shadow-card flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Sales by Category</h2>
            <p className="text-xs text-stone-500">Revenue contribution across kitchen departments</p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsReport.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {analyticsReport.categoryBreakdown.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val}%`, "Contribution"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e7e5e4",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-warm-100">
            {analyticsReport.categoryBreakdown.map((cat, i) => (
              <div key={i} className="flex items-center space-x-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <span className="text-stone-600 truncate">{cat.name}:</span>
                <span className="font-bold text-stone-900">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Financial Performance Table */}
      <div className="rounded-xl bg-white border border-warm-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-warm-100 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">Monthly P&L Historical Performance</h3>
          <span className="text-xs text-stone-500">All figures in INR (₹)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-warm-100/70 border-b border-warm-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4">Food Cost (COGS)</th>
                <th className="py-3 px-4">COGS %</th>
                <th className="py-3 px-4 font-bold text-forest-900">Gross Margin %</th>
                <th className="py-3 px-4">Waste Loss</th>
                <th className="py-3 px-4">Waste %</th>
                <th className="py-3 px-4 text-right">Net Operating Gross</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 text-stone-800 font-mono">
              {analyticsReport.monthlyFinancials.map((row, idx) => {
                const cogsPct = ((row.cogs / row.revenue) * 100).toFixed(1)
                const marginPct = (100 - cogsPct).toFixed(1)
                const wastePct = ((row.waste / row.revenue) * 100).toFixed(1)
                const netGross = row.revenue - row.cogs - row.waste

                return (
                  <tr key={idx} className="hover:bg-warm-50/70 transition">
                    <td className="py-3 px-4 font-sans font-bold text-stone-900">{row.month} 2026</td>
                    <td className="py-3 px-4">₹{row.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4">₹{row.cogs.toLocaleString()}</td>
                    <td className="py-3 px-4 text-stone-500">{cogsPct}%</td>
                    <td className="py-3 px-4 font-bold text-forest-900">{marginPct}%</td>
                    <td className="py-3 px-4 text-rose-600">₹{row.waste.toLocaleString()}</td>
                    <td className="py-3 px-4 text-stone-500">{wastePct}%</td>
                    <td className="py-3 px-4 text-right font-bold text-stone-900">
                      ₹{netGross.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
