import React, { useState } from "react"
import {
  Trash2,
  AlertTriangle,
  Search,
  Plus,
  ArrowDownRight,
  TrendingDown,
  PieChart as PieChartIcon,
  Sparkles,
  CheckCircle2,
  X,
  FileSpreadsheet
} from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { wasteLogs as initialWaste, inventoryItems } from "../data/mockData"

const REASON_COLORS = {
  Spoilage: "#e11d48", // rose
  "Prep Trimming Loss": "#d97706", // gold
  Overproduction: "#2563eb", // blue
  "Storage Glitch": "#9333ea", // purple
  "Quality Rejection": "#64748b", // slate
}

export const WasteManagementPage = () => {
  const [logs, setLogs] = useState(initialWaste)
  const [searchQuery, setSearchQuery] = useState("")
  const [reasonFilter, setReasonFilter] = useState("all")
  const [showLogModal, setShowLogModal] = useState(false)

  // Form states
  const [wasteIngredient, setWasteIngredient] = useState("Tomatoes (Ripe)")
  const [wasteQty, setWasteQty] = useState(2.5)
  const [wasteReason, setWasteReason] = useState("Spoilage")
  const [wasteNotes, setWasteNotes] = useState("")

  // Financial calculations
  const totalWasteCost = logs.reduce((sum, l) => sum + l.financialLoss, 0)
  const totalWeightKg = logs.reduce((sum, l) => sum + (l.unit === "kg" ? l.quantityLost : 0), 0)

  // Reason breakdown for chart
  const reasonBreakdown = Object.entries(
    logs.reduce((acc, l) => {
      acc[l.reason] = (acc[l.reason] || 0) + l.financialLoss
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.loggedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.logNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesReason = reasonFilter === "all" || log.reason === reasonFilter
    return matchesSearch && matchesReason
  })

  const handleCreateWasteLog = (e) => {
    e.preventDefault()
    const invItem = inventoryItems.find((i) => i.name === wasteIngredient)
    const costPerUnit = invItem ? invItem.unitCost : 50
    const loss = Math.round(Number(wasteQty) * costPerUnit)

    const newLog = {
      id: logs.length + 1,
      logNumber: `WST-0${logs.length + 1}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString().split("T")[0],
      ingredientName: wasteIngredient,
      batchRef: "PAN-02",
      quantityLost: Number(wasteQty),
      unit: invItem?.unit || "kg",
      reason: wasteReason,
      financialLoss: loss,
      loggedBy: "Chef Vikram",
      aiRecommendation: "Optimize pre-order prep buffer based on rainy day multiplier.",
    }

    setLogs([newLog, ...logs])
    setShowLogModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Food Waste Management & Auditing
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-forest-100 text-forest-800 border border-forest-200">
              Sustainability KPI
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Track spoilage, trimming losses, financial shrinkage, and discover AI upcycling opportunities.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Log Food Waste</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Waste Loss</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            ₹{totalWasteCost.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium flex items-center mt-1">
            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
            <span>-32.4% vs last week's benchmark</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Waste-to-Sales Ratio</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">1.8%</div>
          <p className="text-[11px] text-stone-500 mt-1">Well below 2.5% industry ceiling</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Quantity Discarded</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{totalWeightKg.toFixed(1)} kg</div>
          <p className="text-[11px] text-stone-500 mt-1">Across 7 distinct waste logs</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">AI Prevented Waste</div>
          <div className="text-2xl font-bold text-gold-700 mt-2">₹14,200 Rescued</div>
          <p className="text-[11px] text-stone-500 mt-1">Through FEFO & leftover specials</p>
        </div>
      </div>

      {/* Visual Chart & Root Causes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Wastage by Reason Bar Chart */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Financial Loss by Cause (₹)</h2>
              <p className="text-xs text-stone-500">Categorical breakdown of food waste drivers</p>
            </div>
            <span className="text-xs font-semibold text-stone-400">Total: ₹{totalWasteCost}</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" />
                <XAxis dataKey="name" stroke="#78716c" fontSize={10} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val) => [`₹${val}`, "Financial Loss"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e7e5e4",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px"
                  }}
                />
                <Bar dataKey="value" fill="#166534" radius={[4, 4, 0, 0]}>
                  {reasonBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={REASON_COLORS[entry.name] || "#166534"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Waste Reduction Protocol */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-forest-950 text-stone-200 border border-forest-900 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-gold-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>AI Prevention Sentinel Insights</span>
            </div>
            <h3 className="text-lg font-bold text-white">Closed-Loop Waste Elimination</h3>
            <p className="text-xs text-stone-300 mt-2 leading-relaxed">
              <strong>Produce Spoilage:</strong> Tomatoes and coriander represent 62% of physical waste.
              Recommend shifting to 3-day frequency batch deliveries from GreenFields produce rather than weekly bulk drop-offs.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-forest-800 space-y-2 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Trimming Loss Standard:</span>
              <span className="text-white font-mono">&lt; 8.0%</span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Actual Trimming Loss:</span>
              <span className="text-emerald-400 font-mono font-bold">5.8% (Target met)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Reason Filters */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search waste logs by ingredient, staff, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 focus:outline-none focus:border-forest-800"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
          <span className="text-stone-500 font-semibold shrink-0">Reason:</span>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-800 text-xs w-full sm:w-auto"
          >
            <option value="all">All Causes</option>
            <option value="Spoilage">Spoilage</option>
            <option value="Prep Trimming Loss">Prep Trimming Loss</option>
            <option value="Overproduction">Overproduction</option>
            <option value="Storage Glitch">Storage Glitch</option>
          </select>
        </div>
      </div>

      {/* Waste Logs Table */}
      <div className="rounded-xl bg-white border border-warm-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-warm-100/70 border-b border-warm-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Time & Date</th>
                <th className="py-3 px-4">Ingredient Discarded</th>
                <th className="py-3 px-4">Quantity Lost</th>
                <th className="py-3 px-4">Reason Category</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4 font-bold text-rose-700">Financial Loss</th>
                <th className="py-3 px-4">AI Prevention Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 text-stone-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-warm-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-stone-600">{log.logNumber}</td>
                  <td className="py-3 px-4 text-stone-500">
                    <div>{log.timestamp}</div>
                    <div className="text-[10px] text-stone-400">{log.date}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-stone-900">{log.ingredientName}</td>
                  <td className="py-3 px-4 font-mono font-bold text-stone-800">
                    {log.quantityLost} {log.unit}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${REASON_COLORS[log.reason]}15`,
                        color: REASON_COLORS[log.reason],
                        borderColor: `${REASON_COLORS[log.reason]}40`,
                        borderWidth: 1,
                      }}
                    >
                      {log.reason}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-stone-600">{log.loggedBy}</td>
                  <td className="py-3 px-4 font-bold text-rose-600 font-mono">
                    ₹{log.financialLoss}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-stone-500 max-w-xs">
                    {log.aiRecommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Waste Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Record Food Waste</h3>
                <p className="text-stone-500">Audit discarded ingredients to calibrate yield</p>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWasteLog} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Ingredient</label>
                <select
                  value={wasteIngredient}
                  onChange={(e) => setWasteIngredient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                >
                  {inventoryItems.map((inv) => (
                    <option key={inv.id} value={inv.name}>
                      {inv.name} ({inv.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Quantity Discarded</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Reason</label>
                  <select
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  >
                    <option value="Spoilage">Spoilage</option>
                    <option value="Prep Trimming Loss">Prep Trimming Loss</option>
                    <option value="Overproduction">Overproduction</option>
                    <option value="Storage Glitch">Storage Glitch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Notes / Root Cause</label>
                <textarea
                  rows={2}
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  placeholder="e.g. Moisture build-up in bottom crisper drawer..."
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-forest-900 text-white font-semibold shadow"
                >
                  Confirm & Log Waste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
