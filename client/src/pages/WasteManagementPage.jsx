import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Info,
  UtensilsCrossed,
  Layers,
  ArrowRight
} from "lucide-react"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { wasteService, inventoryService, menuService } from "../services/api"

const REASON_COLORS = {
  Spoilage: "#e11d48", // rose
  Expiry: "#f43f5e", // red
  Overproduction: "#2563eb", // blue
  "Preparation Waste": "#d97706", // amber
  "Quality Rejection": "#64748b", // slate
  "Storage Glitch": "#9333ea", // purple
  Other: "#78716c" // stone
}

export const WasteManagementPage = () => {
  const navigate = useNavigate()

  // Tab State
  const [activeTab, setActiveTab] = useState("logs") // 'logs' | 'analytics' | 'expiry' | 'risk'

  // Loading & Feedback
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Data States
  const [wasteLogs, setWasteLogs] = useState([])
  const [analyticsData, setAnalyticsData] = useState(null)
  const [expiryAlerts, setExpiryAlerts] = useState(null)
  const [riskAnalysis, setRiskAnalysis] = useState(null)
  const [riskHorizon, setRiskHorizon] = useState(5)

  // Master Data
  const [ingredientsList, setIngredientsList] = useState([])
  const [menuItemsList, setMenuItemsList] = useState([])

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [reasonFilter, setReasonFilter] = useState("all")
  const [itemTypeFilter, setItemTypeFilter] = useState("all")

  // Modal States
  const [showLogModal, setShowLogModal] = useState(false)
  const [modalItemType, setModalItemType] = useState("ingredient") // 'ingredient' | 'prepared_item'
  const [selectedIngredientId, setSelectedIngredientId] = useState("")
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("")
  const [wasteQty, setWasteQty] = useState(2.0)
  const [wasteUnit, setWasteUnit] = useState("kg")
  const [wasteReason, setWasteReason] = useState("Spoilage")
  const [wasteDate, setWasteDate] = useState(new Date().toISOString().split("T")[0])
  const [loggedBy, setLoggedBy] = useState("Head Chef")
  const [wasteNotes, setWasteNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const showNotification = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Fetch all waste data
  const loadData = async () => {
    try {
      setErrorMessage(null)
      const [logsRes, anaRes, expRes, riskRes, ingsRes, menuRes] = await Promise.all([
        wasteService.getAll(),
        wasteService.getAnalytics({ days: 30 }),
        wasteService.getExpiryAlerts(),
        wasteService.getRiskAnalysis({ horizon: riskHorizon }),
        inventoryService.getAll(),
        menuService.getAll()
      ])

      setWasteLogs(logsRes.data?.data || [])
      setAnalyticsData(anaRes.data || null)
      setExpiryAlerts(expRes.data || null)
      setRiskAnalysis(riskRes.data || null)

      const ings = ingsRes.data?.data || []
      const menus = menuRes.data?.data || []
      setIngredientsList(ings)
      setMenuItemsList(menus)

      if (ings.length > 0 && !selectedIngredientId) {
        setSelectedIngredientId(ings[0].id)
        setWasteUnit(ings[0].unit)
      }
      if (menus.length > 0 && !selectedMenuItemId) {
        setSelectedMenuItemId(menus[0].id)
      }
    } catch (err) {
      console.error("Failed to load waste management data:", err)
      setErrorMessage("Failed to load waste data. Please check backend connection.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [riskHorizon])

  // Handle ingredient selection in form
  const handleIngredientChange = (id) => {
    setSelectedIngredientId(id)
    const ing = ingredientsList.find((i) => i.id === parseInt(id))
    if (ing) {
      setWasteUnit(ing.unit)
    }
  }

  // Calculate estimated loss in real-time
  const calculateEstimatedLoss = () => {
    const qty = parseFloat(wasteQty) || 0
    if (modalItemType === "ingredient") {
      const ing = ingredientsList.find((i) => i.id === parseInt(selectedIngredientId))
      return ing ? Math.round(qty * ing.unitCost) : 0
    } else {
      const dish = menuItemsList.find((m) => m.id === parseInt(selectedMenuItemId))
      const costPerServing = dish ? dish.costPrice || dish.price * 0.35 : 50
      return Math.round(qty * costPerServing)
    }
  }

  // Submit Waste Log
  const handleRecordWaste = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        itemType: modalItemType,
        quantity: parseFloat(wasteQty),
        unit: modalItemType === "ingredient" ? wasteUnit : "portions",
        reason: wasteReason,
        date: wasteDate,
        loggedBy,
        notes: wasteNotes
      }

      if (modalItemType === "ingredient") {
        payload.ingredientId = parseInt(selectedIngredientId)
      } else {
        payload.menuItemId = parseInt(selectedMenuItemId)
      }

      const res = await wasteService.recordWaste(payload)
      if (res.data?.success) {
        showNotification(res.data.message || "Food waste recorded successfully.")
        setShowLogModal(false)
        setWasteNotes("")
        await loadData()
      }
    } catch (err) {
      alert("Failed to record waste: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Waste Log
  const handleDeleteLog = async (id) => {
    if (!window.confirm("Are you sure you want to delete this waste record?")) return
    try {
      const res = await wasteService.delete(id)
      if (res.data?.success) {
        showNotification("Waste record deleted.")
        await loadData()
      }
    } catch (err) {
      alert("Failed to delete waste log: " + (err.response?.data?.message || err.message))
    }
  }

  // Filter logs
  const filteredLogs = wasteLogs.filter((log) => {
    const itemName = log.itemName || log.ingredientName || ""
    const matchesSearch =
      itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.loggedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.logNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesReason = reasonFilter === "all" || log.reason?.toLowerCase() === reasonFilter.toLowerCase()
    const matchesType = itemTypeFilter === "all" || log.itemType === itemTypeFilter
    return matchesSearch && matchesReason && matchesType
  })

  // Format Recharts data
  const reasonChartData = (analyticsData?.reasonBreakdown || []).map((r) => ({
    name: r.reason,
    value: r.financialLoss,
    percentage: r.percentage
  }))

  const dailyTrendData = (analyticsData?.dailyTrends || []).slice(-14).map((d) => ({
    date: d.date.slice(5),
    loss: d.financialLoss,
    quantity: d.quantity
  }))

  const topItemsData = (analyticsData?.topWastedItems || []).map((it) => ({
    name: it.name.length > 14 ? it.name.slice(0, 14) + "..." : it.name,
    loss: it.financialLoss,
    qty: it.totalQuantity
  }))

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Food Waste Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              <span>Loss Mitigation</span>
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Track daily spoilage, overproduction, FEFO shelf-life alerts, and predictive waste risk.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => {
              setRefreshing(true)
              loadData()
            }}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-forest-700" : ""}`} />
            <span>Refresh</span>
          </button>

          <a
            href={wasteService.getExportCsvUrl({ reason: reasonFilter, itemType: itemTypeFilter })}
            download
            className="px-3.5 py-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-rose-200" />
            <span>Record Food Waste</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Waste Loss</span>
            <Trash2 className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            ₹{(analyticsData?.totalFinancialLoss || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Across {analyticsData?.totalRecordsCount || wasteLogs.length} logged incidents (last 30d)
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Physical Waste Volume</span>
            <Layers className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            {(analyticsData?.totalQuantityLost || 0).toFixed(1)} Units
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Discarded ingredients & unserved buffer
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Waste-to-Sales Ratio</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-forest-900 mt-2">
            {analyticsData?.wasteToSalesRatio || 1.8}%
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Target benchmark: &lt; 2.5% of gross revenue
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">High-Risk Surplus</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {riskAnalysis?.highRiskCount ?? 0} SKUs at Risk
          </div>
          <p className="text-[11px] text-amber-800 font-medium mt-1">
            ₹{(riskAnalysis?.totalSurplusValueAtRisk || 0).toLocaleString("en-IN")} surplus at risk
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-1 bg-warm-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "logs"
                ? "bg-forest-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Waste Logs ({wasteLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "analytics"
                ? "bg-forest-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Analytics & Trends
          </button>
          <button
            onClick={() => setActiveTab("expiry")}
            className={`px-4 py-2 rounded-lg transition flex items-center space-x-1.5 ${
              activeTab === "expiry"
                ? "bg-forest-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <span>Expiry Alerts</span>
            {expiryAlerts?.expiredCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "risk"
                ? "bg-forest-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Predictive Risk Analysis
          </button>
        </div>

        {activeTab === "risk" && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-500 font-medium">Risk Window:</span>
            {[3, 5, 7].map((h) => (
              <button
                key={h}
                onClick={() => setRiskHorizon(h)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  riskHorizon === h
                    ? "bg-forest-900 text-white"
                    : "bg-warm-100 text-stone-700 hover:bg-warm-200"
                }`}
              >
                {h} Days
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===================== TAB 1: WASTE LOGS ===================== */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search item, log #, or chef..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-xs w-48 sm:w-64 focus:outline-hidden focus:border-forest-600"
                />
              </div>

              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-stone-700 focus:outline-hidden"
              >
                <option value="all">All Reasons</option>
                <option value="Spoilage">Spoilage</option>
                <option value="Expiry">Expiry</option>
                <option value="Overproduction">Overproduction</option>
                <option value="Preparation Waste">Preparation Waste</option>
                <option value="Quality Rejection">Quality Rejection</option>
              </select>

              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-stone-700 focus:outline-hidden"
              >
                <option value="all">All Item Types</option>
                <option value="ingredient">Raw Ingredients</option>
                <option value="prepared_item">Prepared Food Items</option>
              </select>
            </div>

            <div className="text-right text-stone-500 font-medium">
              Showing {filteredLogs.length} of {wasteLogs.length} Records
            </div>
          </div>

          {/* Table */}
          <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-warm-50 text-stone-600 border-y border-warm-200 font-semibold text-[11px]">
                    <th className="py-3 px-3">Log #</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Batch Ref</th>
                    <th className="py-3 px-3">Quantity Lost</th>
                    <th className="py-3 px-3 text-right">Financial Loss</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Logged By</th>
                    <th className="py-3 px-3">Notes</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100 text-stone-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-stone-400">
                        No food waste records found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const badgeColor =
                        log.reason === "Spoilage"
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : log.reason === "Expiry"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : log.reason === "Overproduction"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"

                      return (
                        <tr key={log.id} className="hover:bg-warm-50/50 transition">
                          <td className="py-3 px-3 font-mono font-bold text-forest-900">
                            {log.logNumber}
                          </td>
                          <td className="py-3 px-3 text-stone-600">
                            <div>{log.date}</div>
                            <div className="text-[10px] text-stone-400">{log.timestamp}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-stone-900">
                            {log.itemName || log.ingredientName}
                          </td>
                          <td className="py-3 px-3 text-stone-500 capitalize">
                            {log.itemType === "prepared_item" ? "Prepared Dish" : "Raw Ingredient"}
                          </td>
                          <td className="py-3 px-3 font-mono text-stone-500">
                            {log.batchRef}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold">
                            {log.quantityLost} {log.unit}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-rose-600 text-right">
                            ₹{log.financialLoss.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}
                            >
                              {log.reason}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-stone-600">{log.loggedBy}</td>
                          <td className="py-3 px-3 text-stone-500 max-w-xs truncate" title={log.notes}>
                            {log.notes || "—"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: ANALYTICS & TRENDS ===================== */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Waste Trends Chart */}
            <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Daily Financial Loss Trend</h3>
                  <p className="text-[11px] text-stone-500">Daily waste cost in INR over the last 14 days</p>
                </div>
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                    <XAxis dataKey="date" stroke="#78716c" fontSize={11} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip
                      formatter={(val) => [`₹${val}`, "Loss"]}
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e7e5e4" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="loss"
                      stroke="#e11d48"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#e11d48" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Waste by Reason Distribution */}
            <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Loss by Waste Reason</h3>
                  <p className="text-[11px] text-stone-500">Breakdown of primary root causes</p>
                </div>
                <PieChartIcon className="w-4 h-4 text-forest-800" />
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {reasonChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={REASON_COLORS[entry.name] || "#78716c"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`₹${val}`, "Cost"]}
                      contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Wasted Items Chart */}
          <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
            <h3 className="font-bold text-sm text-stone-900">Top Wasted Ingredients & Dishes</h3>
            <p className="text-[11px] text-stone-500">Highest financial impact items requiring prep adjustments</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe1" />
                  <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`₹${val}`, "Loss"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px" }}
                  />
                  <Bar dataKey="loss" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: EXPIRY ALERTS ===================== */}
      {activeTab === "expiry" && (
        <div className="space-y-6">
          {/* Expired Batches Section */}
          <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-rose-700 flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>Expired Batches — Immediate Disposal Required</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Food safety policy strictly forbids serving or cooking these items.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                {expiryAlerts?.expiredCount || 0} Batches Expired
              </span>
            </div>

            {(expiryAlerts?.expired || []).length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-warm-50 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <span>Zero expired batches detected in active inventory. Excellent rotation!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {expiryAlerts.expired.map((item) => (
                  <div
                    key={item.batchId}
                    className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 text-xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span>{item.ingredientName}</span>
                        <span className="font-mono text-rose-700">₹{item.financialValue}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1 font-mono">
                        Batch: {item.batchNumber} • Qty: {item.remainingQuantity} {item.unit}
                      </div>
                      <div className="text-[11px] text-rose-700 font-semibold mt-1">
                        Expired on: {item.expiryDate} ({Math.abs(item.daysToExpiry)} days ago)
                      </div>
                      <div className="text-[10px] text-stone-600 mt-1">{item.recommendation}</div>
                    </div>

                    <button
                      onClick={() => {
                        setModalItemType("ingredient")
                        setSelectedIngredientId(item.ingredientId)
                        setWasteQty(item.remainingQuantity)
                        setWasteReason("Expiry")
                        setWasteNotes(`Disposed expired batch ${item.batchNumber}`)
                        setShowLogModal(true)
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-center cursor-pointer transition"
                    >
                      Log as Expiry Waste & Discard
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Critical & Warning Batches (FEFO Priority) */}
          <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-forest-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Batches Approaching Expiry — FEFO Priority Queue</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Queue these batches for today's prep or upcycle into Daily Specials before expiration.
                </p>
              </div>
              <button
                onClick={() => navigate("/ai-recipes")}
                className="px-3.5 py-1.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Upcycle in AI Recipes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...(expiryAlerts?.critical || []), ...(expiryAlerts?.warning || [])].map((item) => {
                const isCritical = item.status === "critical"
                const cardBg = isCritical ? "bg-amber-50/60 border-amber-200" : "bg-warm-50 border-warm-200"

                return (
                  <div
                    key={item.batchId}
                    className={`p-4 rounded-xl border text-xs space-y-2 flex flex-col justify-between ${cardBg}`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span>{item.ingredientName}</span>
                        <span className="font-mono text-forest-900">₹{item.financialValue}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1 font-mono">
                        Batch: {item.batchNumber} • Qty: {item.remainingQuantity} {item.unit}
                      </div>
                      <div
                        className={`text-[11px] font-bold mt-1 ${
                          isCritical ? "text-amber-800" : "text-stone-700"
                        }`}
                      >
                        Expires in: {item.daysToExpiry} Day{item.daysToExpiry === 1 ? "" : "s"} ({item.expiryDate})
                      </div>
                      <div className="text-[10px] text-stone-600 mt-1">{item.recommendation}</div>
                    </div>

                    <div className="pt-2 border-t border-warm-200 flex items-center justify-between">
                      <span className="text-[10px] text-stone-400">FEFO Rule Active</span>
                      <button
                        onClick={() => navigate("/ai-recipes")}
                        className="text-[11px] font-semibold text-forest-800 hover:text-forest-950 flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Find Recipes</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: PREDICTIVE WASTE RISK ANALYSIS ===================== */}
      {activeTab === "risk" && (
        <div className="space-y-4">
          {/* Disclaimer Banner */}
          <div className="p-4 rounded-xl bg-warm-100 border border-warm-300 text-stone-700 text-xs flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-forest-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900">Predictive Modeling Notice: </span>
              {riskAnalysis?.disclaimer ||
                "Waste risk categories represent forward-looking predictive estimates based on batch shelf-life and ML demand forecasts. Projected surplus highlights inventory at potential risk and does not claim actual historical food waste reduction."}
            </div>
          </div>

          {/* Risk Table */}
          <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-warm-50 text-stone-600 border-y border-warm-200 font-semibold text-[11px]">
                    <th className="py-3 px-3">Ingredient</th>
                    <th className="py-3 px-3">Usable Stock</th>
                    <th className="py-3 px-3">Expiring in {riskHorizon}d</th>
                    <th className="py-3 px-3">Forecasted Demand</th>
                    <th className="py-3 px-3 font-bold text-rose-700">Projected Surplus</th>
                    <th className="py-3 px-3 text-right">Value at Risk</th>
                    <th className="py-3 px-3 text-center">Risk Level</th>
                    <th className="py-3 px-3">Transparent Risk Rationale</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100 text-stone-800">
                  {(riskAnalysis?.data || []).map((item) => {
                    const badge =
                      item.riskLevel === "HIGH"
                        ? "bg-rose-100 text-rose-800 border-rose-300 font-bold"
                        : item.riskLevel === "MEDIUM"
                        ? "bg-amber-100 text-amber-800 border-amber-300 font-bold"
                        : "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"

                    return (
                      <tr key={item.ingredientId} className="hover:bg-warm-50/50 transition">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-stone-900">{item.name}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {item.sku} • {item.category}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold">
                          {item.usableStock} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-800 font-semibold">
                          {item.expiringWithinHorizon} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600">
                          {item.forecastedDemand} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-600">
                          {item.projectedSurplus > 0 ? `${item.projectedSurplus} ${item.unit}` : "0.0"}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 text-right">
                          ₹{item.surplusValueAtRisk.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase border ${badge}`}>
                            {item.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-600 max-w-sm">
                          {item.explanation}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.projectedSurplus > 0 ? (
                            <button
                              onClick={() => navigate("/ai-recipes")}
                              className="px-2.5 py-1 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-[10px] font-semibold transition cursor-pointer flex items-center space-x-1"
                            >
                              <Sparkles className="w-3 h-3 text-gold-400" />
                              <span>Upcycle</span>
                            </button>
                          ) : (
                            <span className="text-stone-400 text-[10px]">Balanced</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: RECORD FOOD WASTE ===================== */}
      {showLogModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-rose-800">Record Food Waste Event</h3>
                <p className="text-stone-500">Log spoiled, expired, or overproduced food items</p>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordWaste} className="mt-4 space-y-3">
              {/* Type Switcher */}
              <div className="flex bg-warm-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setModalItemType("ingredient")}
                  className={`w-1/2 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                    modalItemType === "ingredient" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                  }`}
                >
                  Raw Ingredient
                </button>
                <button
                  type="button"
                  onClick={() => setModalItemType("prepared_item")}
                  className={`w-1/2 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                    modalItemType === "prepared_item" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600"
                  }`}
                >
                  Prepared Dish
                </button>
              </div>

              {/* Item Selector */}
              {modalItemType === "ingredient" ? (
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Select Ingredient</label>
                  <select
                    value={selectedIngredientId}
                    onChange={(e) => handleIngredientChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  >
                    {ingredientsList.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.unit}) — Current Stock: {ing.currentStock}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Select Prepared Dish</label>
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  >
                    {menuItemsList.map((dish) => (
                      <option key={dish.id} value={dish.id}>
                        {dish.name} (₹{dish.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Wasted Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Unit</label>
                  <input
                    type="text"
                    readOnly
                    value={modalItemType === "ingredient" ? wasteUnit : "portions"}
                    className="w-full px-3 py-2 rounded-lg bg-stone-100 border border-warm-200 text-xs text-stone-500 font-mono"
                  />
                </div>
              </div>

              {/* Reason & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Reason for Waste</label>
                  <select
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  >
                    <option value="Spoilage">Spoilage</option>
                    <option value="Expiry">Expiry</option>
                    <option value="Overproduction">Overproduction</option>
                    <option value="Preparation Waste">Preparation Waste</option>
                    <option value="Quality Rejection">Quality Rejection</option>
                    <option value="Storage Glitch">Storage Glitch</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Incident Date</label>
                  <input
                    type="date"
                    required
                    value={wasteDate}
                    onChange={(e) => setWasteDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  />
                </div>
              </div>

              {/* Logged By */}
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Logged By</label>
                <input
                  type="text"
                  required
                  value={loggedBy}
                  onChange={(e) => setLoggedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Incident Notes & Observations</label>
                <textarea
                  rows={2}
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  placeholder="Root cause notes: temperature spike, buffet leftover, peeling trim..."
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                />
              </div>

              {/* Estimated Financial Loss Display */}
              <div className="p-3 rounded-xl bg-warm-50 border border-warm-200 flex items-center justify-between">
                <span className="text-stone-600 font-semibold">Estimated Financial Loss:</span>
                <span className="font-bold text-base text-rose-600 font-mono">
                  ₹{calculateEstimatedLoss().toLocaleString("en-IN")}
                </span>
              </div>

              {/* Submit / Cancel */}
              <div className="pt-2 flex justify-end space-x-2 border-t border-warm-200">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold shadow cursor-pointer transition"
                >
                  {submitting ? "Saving..." : "Record Waste"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
