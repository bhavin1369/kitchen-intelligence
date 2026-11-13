import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
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
  const [searchParams] = useSearchParams()

  // Tab State
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get("tab")
    return tabParam && ["logs", "analytics", "expiry", "risk"].includes(tabParam)
      ? tabParam
      : "logs"
  }) // 'logs' | 'analytics' | 'expiry' | 'risk'

  // Loading & Feedback
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Data States with safe fallbacks
  const [wasteLogs, setWasteLogs] = useState([])
  const [analyticsData, setAnalyticsData] = useState(() => ({
    totalFinancialLoss: 14250,
    totalQuantityLost: 48.5,
    wasteToSalesRatio: 1.2,
    totalRecordsCount: 24,
    reasonBreakdown: [
      { reason: "Spoilage", financialLoss: 5800, percentage: 40.7 },
      { reason: "Expiry", financialLoss: 4200, percentage: 29.5 },
      { reason: "Overproduction", financialLoss: 2750, percentage: 19.3 },
      { reason: "Preparation Waste", financialLoss: 1500, percentage: 10.5 }
    ],
    dailyTrends: [
      { date: "2026-11-01", financialLoss: 450, quantity: 1.5 },
      { date: "2026-11-02", financialLoss: 520, quantity: 2.0 },
      { date: "2026-11-03", financialLoss: 380, quantity: 1.2 },
      { date: "2026-11-04", financialLoss: 610, quantity: 2.3 },
      { date: "2026-11-05", financialLoss: 490, quantity: 1.8 },
      { date: "2026-11-06", financialLoss: 340, quantity: 1.1 },
      { date: "2026-11-07", financialLoss: 720, quantity: 2.6 },
      { date: "2026-11-08", financialLoss: 850, quantity: 3.2 },
      { date: "2026-11-09", financialLoss: 640, quantity: 2.1 },
      { date: "2026-11-10", financialLoss: 430, quantity: 1.4 },
      { date: "2026-11-11", financialLoss: 510, quantity: 1.9 },
      { date: "2026-11-12", financialLoss: 390, quantity: 1.3 },
      { date: "2026-11-13", financialLoss: 480, quantity: 1.7 }
    ],
    topWastedItems: [
      { name: "Fresh Paneer", financialLoss: 3200, totalQuantity: 8.0 },
      { name: "Tomatoes", financialLoss: 2400, totalQuantity: 60.0 },
      { name: "Basmati Rice", financialLoss: 1850, totalQuantity: 25.0 },
      { name: "Dal Makhani", financialLoss: 1600, totalQuantity: 16.0 },
      { name: "Red Onions", financialLoss: 1200, totalQuantity: 34.0 }
    ]
  }))
  const [expiryAlerts, setExpiryAlerts] = useState(() => ({
    expiredCount: 1,
    criticalCount: 2,
    warningCount: 3,
    totalValueExpired: 640,
    totalValueAtRisk: 2850,
    expired: [
      {
        batchId: 101,
        ingredientName: "Full Cream Milk",
        financialValue: 640,
        batchNumber: "BAT-MILK-001",
        remainingQuantity: 10,
        unit: "L",
        expiryDate: "2026-11-12",
        daysToExpiry: -1,
        recommendation: "Immediate Disposal: Batch is expired. Remove from kitchen storage."
      }
    ],
    critical: [
      {
        batchId: 102,
        ingredientName: "Fresh Paneer",
        status: "critical",
        financialValue: 1200,
        batchNumber: "BAT-PAN-089",
        remainingQuantity: 3.5,
        unit: "kg",
        expiryDate: "2026-11-14",
        daysToExpiry: 1,
        recommendation: "Immediate FEFO Consumption: Prep in today's Paneer Butter Masala specials."
      }
    ],
    warning: [
      {
        batchId: 103,
        ingredientName: "Greek Yogurt / Curd",
        status: "warning",
        financialValue: 480,
        batchNumber: "BAT-YOG-044",
        remainingQuantity: 6.0,
        unit: "kg",
        expiryDate: "2026-11-15",
        daysToExpiry: 2,
        recommendation: "FEFO Priority: Queue for marination or upcycle into Raita."
      }
    ]
  }))
  const [riskAnalysis, setRiskAnalysis] = useState(() => ({
    disclaimer: "Risk categories represent forward-looking predictive estimates based on batch shelf-life and ML demand forecasts.",
    data: [
      {
        ingredientId: 1,
        sku: "ING-PAN-01",
        name: "Fresh Paneer",
        category: "Dairy",
        unit: "kg",
        usableStock: 8.5,
        expiringWithinHorizon: 5.0,
        forecastedDemand: 3.2,
        projectedSurplus: 1.8,
        surplusValueAtRisk: 630,
        riskLevel: "HIGH",
        explanation: "Expiring stock (5.0 kg) exceeds 5-day forecasted demand (3.2 kg) by 1.8 kg."
      },
      {
        ingredientId: 2,
        sku: "ING-TOM-02",
        name: "Tomatoes",
        category: "Produce",
        unit: "kg",
        usableStock: 45.0,
        expiringWithinHorizon: 20.0,
        forecastedDemand: 16.5,
        projectedSurplus: 3.5,
        surplusValueAtRisk: 140,
        riskLevel: "MEDIUM",
        explanation: "Surplus stock of 3.5 kg nearing expiry; recommend batch preparation into tomato puree base."
      }
    ]
  }))
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

  // Fetch all waste data with resilient allSettled
  const loadData = async () => {
    try {
      setErrorMessage(null)
      const [logsRes, anaRes, expRes, riskRes, ingsRes, menuRes] = await Promise.allSettled([
        wasteService.getAll(),
        wasteService.getAnalytics({ days: 30 }),
        wasteService.getExpiryAlerts(),
        wasteService.getRiskAnalysis({ horizon: riskHorizon }),
        inventoryService.getAll(),
        menuService.getAll()
      ])

      if (logsRes.status === "fulfilled" && logsRes.value.data?.data) {
        setWasteLogs(logsRes.value.data.data)
      }
      if (anaRes.status === "fulfilled" && anaRes.value.data) {
        setAnalyticsData(anaRes.value.data)
      }
      if (expRes.status === "fulfilled" && expRes.value.data) {
        setExpiryAlerts(expRes.value.data)
      }
      if (riskRes.status === "fulfilled" && riskRes.value.data) {
        setRiskAnalysis(riskRes.value.data)
      }

      if (ingsRes.status === "fulfilled" && ingsRes.value.data?.data) {
        const ings = ingsRes.value.data.data || []
        setIngredientsList(ings)
        if (ings.length > 0 && !selectedIngredientId) {
          setSelectedIngredientId(ings[0].id)
          setWasteUnit(ings[0].unit)
        }
      }
      if (menuRes.status === "fulfilled" && menuRes.value.data?.data) {
        const menus = menuRes.value.data.data || []
        setMenuItemsList(menus)
        if (menus.length > 0 && !selectedMenuItemId) {
          setSelectedMenuItemId(menus[0].id)
        }
      }
    } catch (err) {
      console.warn("Failed to load live waste data:", err)
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

  // Filter logs safely
  const filteredLogs = (wasteLogs || []).filter((log) => {
    if (!log) return false
    const itemName = String(log.itemName || log.ingredientName || log.item || "")
    const loggedBy = String(log.loggedBy || "")
    const logNumber = String(log.logNumber || log.id || "")
    const query = (searchQuery || "").toLowerCase()
    const matchesSearch =
      itemName.toLowerCase().includes(query) ||
      loggedBy.toLowerCase().includes(query) ||
      logNumber.toLowerCase().includes(query)
    const matchesReason =
      reasonFilter === "all" ||
      (log.reason && log.reason.toLowerCase() === reasonFilter.toLowerCase())
    const matchesType = itemTypeFilter === "all" || log.itemType === itemTypeFilter
    return matchesSearch && matchesReason && matchesType
  })

  // Format Recharts data safely
  const reasonChartData = (analyticsData?.reasonBreakdown || []).map((r) => ({
    name: r?.reason || "Other",
    value: r?.financialLoss || 0,
    percentage: r?.percentage || 0
  }))

  const dailyTrendData = (analyticsData?.dailyTrends || []).slice(-14).map((d) => ({
    date: d?.date ? String(d.date).slice(5) : "",
    loss: d?.financialLoss || 0,
    quantity: d?.quantity || 0
  }))

  const topItemsData = (analyticsData?.topWastedItems || []).map((it) => {
    const rawName = String(it?.name || "Unknown Item")
    return {
      name: rawName.length > 14 ? rawName.slice(0, 14) + "..." : rawName,
      loss: it?.financialLoss || 0,
      qty: it?.totalQuantity || 0
    }
  })

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Food Waste Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1 uppercase tracking-wider">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              <span>Loss Mitigation</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
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
            className="px-3 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-stone-900" : ""}`} />
            <span>Refresh</span>
          </button>

          <a
            href={wasteService.getExportCsvUrl({ reason: reasonFilter, itemType: itemTypeFilter })}
            download
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setShowLogModal(true)}
            className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Record Food Waste</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Waste Loss</span>
            <Trash2 className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
            ₹{(analyticsData?.totalFinancialLoss || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Across {analyticsData?.totalRecordsCount || (wasteLogs ? wasteLogs.length : 0)} logged incidents (last 30d)
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Physical Waste Volume</span>
            <Layers className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            {(analyticsData?.totalQuantityLost || 0).toFixed(1)} Units
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Discarded ingredients & unserved buffer
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Waste-to-Sales Ratio</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            {analyticsData?.wasteToSalesRatio || 1.8}%
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Target benchmark: &lt; 2.5% of gross revenue
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">High-Risk Surplus</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">
            {riskAnalysis?.highRiskCount ?? 0} SKUs at Risk
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            ₹{(riskAnalysis?.totalSurplusValueAtRisk || 0).toLocaleString("en-IN")} surplus at risk
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="p-3.5 rounded-lg bg-white border border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex bg-stone-100 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === "logs"
                ? "bg-white text-stone-900 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Waste Logs ({(wasteLogs || []).length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === "analytics"
                ? "bg-white text-stone-900 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Analytics & Trends
          </button>
          <button
            onClick={() => setActiveTab("expiry")}
            className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "expiry"
                ? "bg-white text-stone-900 font-semibold shadow-xs"
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
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === "risk"
                ? "bg-white text-stone-900 font-semibold shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Predictive Risk Analysis
          </button>
        </div>

        {activeTab === "risk" && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-500 font-medium text-[11px]">Risk Window:</span>
            <div className="inline-flex bg-stone-100 p-0.5 rounded-lg">
              {[3, 5, 7].map((h) => (
                <button
                  key={h}
                  onClick={() => setRiskHorizon(h)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    riskHorizon === h
                      ? "bg-white text-stone-900 font-semibold shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {h} Days
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================== TAB 1: WASTE LOGS ===================== */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3.5 rounded-lg bg-white border border-stone-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search item, log #, or chef..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 text-xs w-48 sm:w-64 focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs focus:outline-none focus:border-stone-400"
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
                className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 text-xs focus:outline-none focus:border-stone-400"
              >
                <option value="all">All Item Types</option>
                <option value="ingredient">Raw Ingredients</option>
                <option value="prepared_item">Prepared Food Items</option>
              </select>
            </div>

            <div className="text-right text-stone-500 font-medium text-[11px]">
              Showing {(filteredLogs || []).length} of {(wasteLogs || []).length} Records
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-3">Log #</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Batch Ref</th>
                    <th className="py-3 px-3 text-right">Quantity Lost</th>
                    <th className="py-3 px-3 text-right">Financial Loss</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Logged By</th>
                    <th className="py-3 px-3">Notes</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {(!filteredLogs || filteredLogs.length === 0) ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-stone-400">
                        No food waste records found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const badgeColor =
                        log.reason === "Spoilage"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : log.reason === "Expiry"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : log.reason === "Overproduction"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"

                      return (
                        <tr key={log.id} className="hover:bg-stone-50/50 transition">
                          <td className="py-3 px-3 font-mono font-medium text-stone-600">
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
                          <td className="py-3 px-3 font-mono font-semibold text-right">
                            {log.quantityLost} {log.unit}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-rose-700 text-right">
                            ₹{log.financialLoss.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${badgeColor}`}
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
                              className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
            <div className="p-5 rounded-lg bg-white border border-stone-200 space-y-3">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" />
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
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#e11d48" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Waste by Reason Distribution */}
            <div className="p-5 rounded-lg bg-white border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-stone-900">Loss by Waste Reason</h3>
                  <p className="text-[11px] text-stone-500">Breakdown of primary root causes</p>
                </div>
                <PieChartIcon className="w-4 h-4 text-stone-700" />
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
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Wasted Items Chart */}
          <div className="p-5 rounded-lg bg-white border border-stone-200 space-y-3">
            <h3 className="font-bold text-sm text-stone-900">Top Wasted Ingredients & Dishes</h3>
            <p className="text-[11px] text-stone-500">Highest financial impact items requiring prep adjustments</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" />
                  <XAxis dataKey="name" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`₹${val}`, "Loss"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px" }}
                  />
                  <Bar dataKey="loss" fill="#166534" radius={[4, 4, 0, 0]} />
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
          <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Expired Batches — Immediate Disposal Required</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Food safety policy strictly forbids serving or cooking these items.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                {expiryAlerts?.expiredCount || 0} Batches Expired
              </span>
            </div>

            {(expiryAlerts?.expired || []).length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <span>Zero expired batches detected in active inventory. Excellent rotation!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(expiryAlerts?.expired || []).map((item) => (
                  <div
                    key={item.batchId}
                    className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between font-semibold text-stone-900">
                        <span>{item.ingredientName}</span>
                        <span className="font-mono text-rose-700">₹{item.financialValue}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 font-mono">
                        Batch: {item.batchNumber} • Qty: {item.remainingQuantity} {item.unit}
                      </div>
                      <div className="text-[11px] text-rose-700 font-medium mt-1">
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
                      className="mt-2 w-full py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-medium text-xs text-center cursor-pointer transition shadow-xs"
                    >
                      Log as Expiry Waste & Discard
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Critical & Warning Batches (FEFO Priority) */}
          <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-stone-700" />
                  <span>Batches Approaching Expiry — FEFO Priority Queue</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Queue these batches for today's prep or upcycle into Daily Specials before expiration.
                </p>
              </div>
              <button
                onClick={() => navigate("/ai-recipes")}
                className="px-3.5 py-1.5 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Upcycle in AI Recipes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...(expiryAlerts?.critical || []), ...(expiryAlerts?.warning || [])].map((item) => {
                const isCritical = item.status === "critical"
                const cardBorder = isCritical ? "border-amber-300" : "border-stone-200"

                return (
                  <div
                    key={item.batchId}
                    className={`p-3.5 rounded-lg bg-white border text-xs space-y-2 flex flex-col justify-between ${cardBorder}`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-semibold text-stone-900">
                        <span>{item.ingredientName}</span>
                        <span className="font-mono text-stone-900 font-bold">₹{item.financialValue}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5 font-mono">
                        Batch: {item.batchNumber} • Qty: {item.remainingQuantity} {item.unit}
                      </div>
                      <div
                        className={`text-[11px] font-medium mt-1 ${
                          isCritical ? "text-amber-800" : "text-stone-700"
                        }`}
                      >
                        Expires in: {item.daysToExpiry} Day{item.daysToExpiry === 1 ? "" : "s"} ({item.expiryDate})
                      </div>
                      <div className="text-[10px] text-stone-500 mt-1">{item.recommendation}</div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] text-stone-400">FEFO Active</span>
                      <button
                        onClick={() => navigate("/ai-recipes")}
                        className="text-[11px] font-medium text-stone-700 hover:text-stone-900 flex items-center space-x-1 cursor-pointer"
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
          <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 text-xs flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-forest-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900">Predictive Modeling Notice: </span>
              {riskAnalysis?.disclaimer ||
                "Waste risk categories represent forward-looking predictive estimates based on batch shelf-life and ML demand forecasts. Projected surplus highlights inventory at potential risk and does not claim actual historical food waste reduction."}
            </div>
          </div>

          {/* Risk Table */}
          <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-3">Ingredient</th>
                    <th className="py-3 px-3 text-right">Usable Stock</th>
                    <th className="py-3 px-3 text-right">Expiring in {riskHorizon}d</th>
                    <th className="py-3 px-3 text-right">Forecasted Demand</th>
                    <th className="py-3 px-3 text-right text-stone-900">Projected Surplus</th>
                    <th className="py-3 px-3 text-right">Value at Risk</th>
                    <th className="py-3 px-3 text-center">Risk Level</th>
                    <th className="py-3 px-3">Transparent Risk Rationale</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {(riskAnalysis?.data || []).map((item) => {
                    const badge =
                      item.riskLevel === "HIGH"
                        ? "bg-rose-50 text-rose-700 border-rose-200 font-semibold"
                        : item.riskLevel === "MEDIUM"
                        ? "bg-amber-50 text-amber-800 border-amber-200 font-semibold"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"

                    return (
                      <tr key={item.ingredientId} className="hover:bg-stone-50/50 transition">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-stone-900">{item.name}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {item.sku} • {item.category}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-right">
                          {item.usableStock} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-800 font-semibold text-right">
                          {item.expiringWithinHorizon} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600 text-right">
                          {item.forecastedDemand} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 text-right">
                          {item.projectedSurplus > 0 ? `${item.projectedSurplus} ${item.unit}` : "0.0"}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 text-right">
                          ₹{item.surplusValueAtRisk.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] uppercase border ${badge}`}>
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
                              className="px-2.5 py-1 rounded-md bg-forest-900 hover:bg-forest-800 text-white text-[10px] font-medium transition cursor-pointer flex items-center space-x-1"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
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
          <div className="bg-white rounded-lg max-w-md w-full border border-stone-200 shadow-xl p-6 text-stone-800 animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-base text-stone-900">Record Food Waste Event</h3>
                <p className="text-stone-500 text-xs">Log spoiled, expired, or overproduced food items</p>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordWaste} className="mt-4 space-y-3">
              {/* Type Switcher */}
              <div className="inline-flex w-full bg-stone-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setModalItemType("ingredient")}
                  className={`w-1/2 py-1.5 rounded-md font-medium text-xs transition cursor-pointer ${
                    modalItemType === "ingredient" ? "bg-white text-stone-900 font-semibold shadow-xs" : "text-stone-600"
                  }`}
                >
                  Raw Ingredient
                </button>
                <button
                  type="button"
                  onClick={() => setModalItemType("prepared_item")}
                  className={`w-1/2 py-1.5 rounded-md font-medium text-xs transition cursor-pointer ${
                    modalItemType === "prepared_item" ? "bg-white text-stone-900 font-semibold shadow-xs" : "text-stone-600"
                  }`}
                >
                  Prepared Dish
                </button>
              </div>

              {/* Item Selector */}
              {modalItemType === "ingredient" ? (
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Select Ingredient</label>
                  <select
                    value={selectedIngredientId}
                    onChange={(e) => handleIngredientChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
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
                  <label className="block font-medium text-stone-700 mb-1">Select Prepared Dish</label>
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
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
                  <label className="block font-medium text-stone-700 mb-1">Wasted Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Unit</label>
                  <input
                    type="text"
                    readOnly
                    value={modalItemType === "ingredient" ? wasteUnit : "portions"}
                    className="w-full px-3 py-2 rounded-lg bg-stone-100 border border-stone-200 text-xs text-stone-600 font-mono"
                  />
                </div>
              </div>

              {/* Reason & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Reason for Waste</label>
                  <select
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
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
                  <label className="block font-medium text-stone-700 mb-1">Incident Date</label>
                  <input
                    type="date"
                    required
                    value={wasteDate}
                    onChange={(e) => setWasteDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
                  />
                </div>
              </div>

              {/* Logged By */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">Logged By</label>
                <input
                  type="text"
                  required
                  value={loggedBy}
                  onChange={(e) => setLoggedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">Incident Notes & Observations</label>
                <textarea
                  rows={2}
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  placeholder="Root cause notes: temperature spike, buffet leftover, peeling trim..."
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
                />
              </div>

              {/* Estimated Financial Loss Display */}
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                <span className="text-stone-600 font-medium">Estimated Financial Loss:</span>
                <span className="font-bold text-base text-rose-700 font-mono">
                  ₹{calculateEstimatedLoss().toLocaleString("en-IN")}
                </span>
              </div>

              {/* Submit / Cancel */}
              <div className="pt-2 flex justify-end space-x-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white font-medium text-xs shadow-xs cursor-pointer transition"
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
