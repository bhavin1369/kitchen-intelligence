import React, { useState, useEffect } from "react"
import {
  Boxes,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  ChevronRight,
  ShieldAlert,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  History,
  TrendingDown,
  FileText
} from "lucide-react"
import { inventoryService } from "../services/api"

export const InventoryPage = () => {
  // State
  const [items, setItems] = useState([])
  const [batches, setBatches] = useState([])
  const [movements, setMovements] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters & Tabs
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("inventory") // 'inventory', 'batches', 'movements'

  // Modals
  const [selectedIngredientForBatches, setSelectedIngredientForBatches] = useState(null)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showConsumeModal, setShowConsumeModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)

  // Receive Batch Form State
  const [formIngredientId, setFormIngredientId] = useState("")
  const [formBatchNumber, setFormBatchNumber] = useState("")
  const [formBatchQty, setFormBatchQty] = useState(10)
  const [formBatchCost, setFormBatchCost] = useState(50)
  const [formBatchExpiry, setFormBatchExpiry] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  )
  const [formSupplier, setFormSupplier] = useState("")

  // Consume / Stock Issuance Form State
  const [consumeIngId, setConsumeIngId] = useState("")
  const [consumeQty, setConsumeQty] = useState(2)
  const [consumeReason, setConsumeReason] = useState("kitchen_prep")

  // Stock Adjustment Form State
  const [adjustIngId, setAdjustIngId] = useState("")
  const [adjustNewStock, setAdjustNewStock] = useState(0)
  const [adjustNotes, setAdjustNotes] = useState("Physical stock take count")

  // Fetch Inventory Data from Backend
  const loadInventoryData = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const [ingRes, batchRes, movRes, dashRes] = await Promise.all([
        inventoryService.getIngredients(),
        inventoryService.getBatches(),
        inventoryService.getMovements({ limit: 40 }),
        inventoryService.getDashboard(),
      ])

      if (ingRes.data?.success) setItems(ingRes.data.data || [])
      if (batchRes.data?.success) setBatches(batchRes.data.data || [])
      if (movRes.data?.success) setMovements(movRes.data.data || [])
      if (dashRes.data?.success) setDashboardMetrics(dashRes.data)
    } catch (err) {
      console.error("Inventory load error:", err)
      setError(err.response?.data?.message || "Failed to load inventory data from server.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadInventoryData()
  }, [])

  // Auto-dismiss alert
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4500)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  // Extract Categories
  const categories = ["all", "Produce", "Dairy", "Grains & Staples", "Spices", "Oils & Ghee", "Snacks", "Beverages"]

  // Filtered Inventory Items
  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCategory === "all" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.preferredSupplier && item.preferredSupplier.toLowerCase().includes(searchQuery.toLowerCase()))

    let matchesStatus = true
    if (statusFilter === "low") matchesStatus = item.currentStock <= item.reorderPoint
    if (statusFilter === "normal") matchesStatus = item.currentStock > item.reorderPoint
    if (statusFilter === "out") matchesStatus = item.currentStock <= 0.001

    return matchesCat && matchesSearch && matchesStatus
  })

  // Open Receive Batch Modal
  const handleOpenReceiveModal = (prefillIngredient = null) => {
    const target = prefillIngredient || items[0]
    if (target) {
      setFormIngredientId(target.id)
      setFormBatchNumber(
        `${target.name.substring(0, 3).toUpperCase()}-${new Date().toISOString().slice(5, 10).replace("-", "")}-${Math.floor(10 + Math.random() * 90)}`
      )
      setFormBatchQty(10)
      setFormBatchCost(target.unitCost || 50)
      const shelfDays = target.shelfLifeDays || 7
      const expDate = new Date(Date.now() + shelfDays * 86400000).toISOString().split("T")[0]
      setFormBatchExpiry(expDate)
      setFormSupplier(target.preferredSupplier || "Local Vendor")
    }
    setShowReceiveModal(true)
  }

  // Submit Receive Batch
  const handleReceiveStock = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const matchedIng = items.find((i) => i.id === parseInt(formIngredientId, 10))

    try {
      const payload = {
        ingredientId: parseInt(formIngredientId, 10),
        batchNumber: formBatchNumber,
        quantity: parseFloat(formBatchQty),
        unit: matchedIng ? matchedIng.unit : "kg",
        unitCost: parseFloat(formBatchCost),
        expiryDate: formBatchExpiry,
        supplierName: formSupplier,
      }

      const res = await inventoryService.receiveBatch(payload)
      if (res.data?.success) {
        setSuccessMsg(
          `Batch ${formBatchNumber} received into stock! Logged in FEFO inventory.`
        )
        setShowReceiveModal(false)
        loadInventoryData(true)
      }
    } catch (err) {
      console.error("Receive batch error:", err)
      setError(err.response?.data?.message || "Failed to receive batch.")
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Stock Consumption (FEFO)
  const handleConsumeStock = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await inventoryService.consumeStock({
        ingredientId: parseInt(consumeIngId, 10),
        quantity: parseFloat(consumeQty),
        reason: consumeReason,
      })
      if (res.data?.success) {
        setSuccessMsg(res.data.message || "Stock consumed via FEFO.")
        setShowConsumeModal(false)
        loadInventoryData(true)
      }
    } catch (err) {
      console.error("Stock consumption error:", err)
      setError(err.response?.data?.message || "Failed to consume stock.")
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Physical Count Adjustment
  const handleAdjustStock = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await inventoryService.adjustStock({
        ingredientId: parseInt(adjustIngId, 10),
        newStock: parseFloat(adjustNewStock),
        notes: adjustNotes,
      })
      if (res.data?.success) {
        setSuccessMsg(res.data.message || "Inventory stock adjusted.")
        setShowAdjustModal(false)
        loadInventoryData(true)
      }
    } catch (err) {
      console.error("Stock adjustment error:", err)
      setError(err.response?.data?.message || "Failed to adjust stock.")
    } finally {
      setSubmitting(false)
    }
  }

  // Metrics
  const totalValuation = dashboardMetrics?.totalInventoryValue || items.reduce((sum, it) => sum + (it.currentStock * it.unitCost), 0)
  const lowStockCount = dashboardMetrics?.lowStockCount || items.filter((it) => it.currentStock <= it.reorderPoint).length
  const nearExpiryBatches = batches.filter((b) => b.shelfLifeStatus === "critical" || b.shelfLifeStatus === "warning")
  const expiredBatchesCount = dashboardMetrics?.expiredBatchesCount || batches.filter((b) => b.shelfLifeStatus === "expired").length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Smart Inventory Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200 uppercase tracking-wider">
              FEFO Enforced
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time usable stock, batch expiry tracking, and First-Expired, First-Out (FEFO) consumption audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadInventoryData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-stone-900" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              if (items.length > 0) {
                setConsumeIngId(items[0].id)
                setConsumeQty(2)
                setConsumeReason("kitchen_prep")
              }
              setShowConsumeModal(true)
            }}
            className="px-3 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
          >
            <TrendingDown className="w-3.5 h-3.5 text-stone-500" />
            <span>Record Consumption</span>
          </button>

          <button
            onClick={() => handleOpenReceiveModal()}
            className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-gold-400" />
            <span>Receive New Batch (Stock-In)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Total Usable Valuation</div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            ₹{Math.round(totalValuation).toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">{items.length} Active Raw Ingredients</p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Low Stock SKUs</div>
          <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">{lowStockCount} Items</div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Below safety reorder threshold</p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Near-Expiry Batches</div>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">{nearExpiryBatches.length} Batches</div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Within 48h shelf life window</p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">FEFO Integrity</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">100% Active</div>
          <p className="text-[11px] text-stone-500 mt-1">Oldest non-expired batch consumed first</p>
        </div>
      </div>

      {/* View Mode Navigation Tabs */}
      <div className="flex border-b border-stone-200 text-xs font-medium">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 px-4 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "inventory"
              ? "border-stone-900 text-stone-900 font-semibold"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Usable Inventory Stock ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-3 px-4 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "batches"
              ? "border-stone-900 text-stone-900 font-semibold"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>FEFO Batches & Expiry ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("movements")}
          className={`pb-3 px-4 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "movements"
              ? "border-stone-900 text-stone-900 font-semibold"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Audit Trail ({movements.length})</span>
        </button>
      </div>
      {/* TAB 1: USABLE INVENTORY STOCK */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Controls: Search & Category Tabs */}
          <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by ingredient, SKU, or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-stone-500 font-medium text-[11px]">Filter:</span>
                <div className="inline-flex bg-stone-100 p-0.5 rounded-lg">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      statusFilter === "all" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    All SKUs
                  </button>
                  <button
                    onClick={() => setStatusFilter("low")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      statusFilter === "low" ? "bg-white text-amber-800 shadow-xs font-semibold" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Low Stock
                  </button>
                  <button
                    onClick={() => setStatusFilter("out")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      statusFilter === "out" ? "bg-white text-rose-800 shadow-xs font-semibold" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Out of Stock
                  </button>
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md whitespace-nowrap text-xs transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-stone-900 text-white font-medium shadow-xs"
                      : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 font-normal"
                  }`}
                >
                  {cat === "all" ? "All Categories" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Main Inventory Table */}
          <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-forest-800 animate-spin" />
                <p className="text-xs text-stone-500">Loading live inventory from SQLite...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3 px-4">SKU Code</th>
                      <th className="py-3 px-4">Ingredient Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Current Usable Stock</th>
                      <th className="py-3 px-4 text-right">Reorder Point</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Total Value</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-stone-400">
                          No ingredients found matching your search and filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isOut = item.currentStock <= 0.001
                        const isLow = item.currentStock <= item.reorderPoint
                        const itemTotalVal = Math.round(item.currentStock * item.unitCost)
                        const ingBatches = batches.filter((b) => b.ingredientId === item.id)

                        return (
                          <tr key={item.id} className="hover:bg-stone-50/70 transition">
                            <td className="py-3 px-4 font-mono font-medium text-stone-600">{item.sku}</td>
                            <td className="py-3 px-4 font-semibold text-stone-900">
                              <div>{item.name}</div>
                              <div className="text-[10px] text-stone-400 font-normal">{item.preferredSupplier}</div>
                            </td>
                            <td className="py-3 px-4 text-stone-500">{item.category}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-stone-900 text-right">
                              {item.usableStock !== undefined ? item.usableStock : item.currentStock}{" "}
                              <span className="text-xs font-normal text-stone-500">{item.unit}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-stone-600 text-right">
                              {item.reorderPoint} {item.unit}
                            </td>
                            <td className="py-3 px-4 font-mono text-stone-600 text-right">₹{item.unitCost}</td>
                            <td className="py-3 px-4 font-mono font-semibold text-stone-900 text-right">
                              ₹{itemTotalVal.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isOut ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Sufficient
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5">
                              <button
                                onClick={() => setSelectedIngredientForBatches(item)}
                                className="px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium transition cursor-pointer"
                                title="Inspect FEFO Batches"
                              >
                                Batches ({ingBatches.length})
                              </button>
                              <button
                                onClick={() => handleOpenReceiveModal(item)}
                                className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                                title="Stock In New Batch"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setAdjustIngId(item.id)
                                  setAdjustNewStock(item.currentStock)
                                  setAdjustNotes("Physical count audit")
                                  setShowAdjustModal(true)
                                }}
                                className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                                title="Audit / Stock Adjustment"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FEFO BATCHES & EXPIRY SENTINEL */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-white border border-stone-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-stone-700" />
                <span>FEFO Batch Expiry Sentinel</span>
              </h2>
              <p className="text-xs text-stone-500">
                Pantry inventory batches arranged strictly by expiry date (First-Expired, First-Out)
              </p>
            </div>

            <button
              onClick={() => handleOpenReceiveModal()}
              className="px-3.5 py-1.5 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium cursor-pointer"
            >
              + Stock In Batch
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {batches.map((batch) => {
              const isCrit = batch.shelfLifeStatus === "critical"
              const isWarn = batch.shelfLifeStatus === "warning"
              const isExp = batch.shelfLifeStatus === "expired"

              return (
                <div
                  key={batch.id}
                  className={`p-3.5 rounded-lg border transition ${
                    isExp
                      ? "bg-stone-50 border-stone-200 text-stone-500 opacity-75"
                      : isCrit
                      ? "bg-white border-rose-300"
                      : isWarn
                      ? "bg-white border-amber-300"
                      : "bg-white border-stone-200 text-stone-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-stone-900">{batch.batchNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        isExp
                          ? "bg-stone-100 text-stone-600 border border-stone-200"
                          : isCrit
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : isWarn
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isExp
                        ? "Expired"
                        : batch.daysToExpiry <= 1
                        ? "Expires Tomorrow"
                        : `${batch.daysToExpiry} Days Left`}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-stone-900 mt-2">{batch.ingredientName}</h3>
                  <div className="text-xs text-stone-600 mt-1 space-y-0.5">
                    <div>
                      Remaining: <strong className="font-mono text-stone-900">{batch.quantityRemaining} {batch.unit}</strong>{" "}
                      <span className="text-[10px] text-stone-400">/ {batch.initialQuantity} received</span>
                    </div>
                    <div>Expiry Date: <span className="font-mono">{batch.expiryDate}</span></div>
                    <div>Supplier: {batch.supplierName}</div>
                    {batch.unitCost > 0 && (
                      <div className="text-[11px] text-stone-500 font-mono">
                        Unit Cost: ₹{batch.unitCost}/{batch.unit}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENT AUDIT TRAIL */}
      {activeTab === "movements" && (
        <div className="rounded-lg bg-white border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                Stock Movement Audit Trail ({movements.length} Events)
              </h3>
              <p className="text-xs text-stone-500">
                Immutable ledger of sales consumption, batch receiving, and audit adjustments
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Ingredient</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3 text-right">Quantity Delta</th>
                  <th className="py-2.5 px-3">Reference / Order</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {movements.map((m) => {
                  const isPositive = m.quantity > 0
                  return (
                    <tr key={m.id} className="hover:bg-stone-50/50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                        {m.timestamp || m.date}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-stone-900">
                        {m.ingredientName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize font-medium text-stone-700">
                          {m.movementType?.replace("_", " ")}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 font-mono font-semibold text-right ${isPositive ? "text-emerald-700" : "text-stone-900"}`}>
                        {isPositive ? `+${m.quantity}` : m.quantity} {m.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-600">
                        {m.referenceId || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-stone-500 truncate max-w-xs">
                        {m.notes || "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Inspect Ingredient Batches Modal */}
      {selectedIngredientForBatches && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full border border-stone-200 shadow-xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-base text-stone-900">
                  Batches: {selectedIngredientForBatches.name}
                </h3>
                <p className="text-xs text-stone-500">
                  Current Usable Stock: <strong className="font-mono text-stone-900">{selectedIngredientForBatches.usableStock || selectedIngredientForBatches.currentStock} {selectedIngredientForBatches.unit}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedIngredientForBatches(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto">
              {batches.filter((b) => b.ingredientId === selectedIngredientForBatches.id).length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  No active batches recorded for this ingredient.
                </div>
              ) : (
                batches
                  .filter((b) => b.ingredientId === selectedIngredientForBatches.id)
                  .map((b) => (
                    <div key={b.id} className="p-3 rounded-lg border border-stone-200 bg-stone-50 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-stone-900 font-mono">{b.batchNumber}</div>
                        <div className="text-[11px] text-stone-500">
                          Expires: <strong>{b.expiryDate}</strong> ({b.daysToExpiry} days remaining)
                        </div>
                        <div className="text-[10px] text-stone-400">Supplier: {b.supplierName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-stone-900 text-sm font-mono">
                          {b.quantityRemaining} {b.unit}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-medium uppercase">
                          {b.shelfLifeStatus}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-stone-200 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedIngredientForBatches(null)}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = selectedIngredientForBatches
                  setSelectedIngredientForBatches(null)
                  handleOpenReceiveModal(target)
                }}
                className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium cursor-pointer"
              >
                + Receive New Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive New Batch Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full border border-stone-200 shadow-xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-base text-stone-900">Receive Batch (Stock-In)</h3>
                <p className="text-xs text-stone-500">Record delivery receipt and initiate FEFO tracking</p>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveStock} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Select Ingredient <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formIngredientId}
                  onChange={(e) => {
                    const selId = parseInt(e.target.value, 10)
                    setFormIngredientId(selId)
                    const matched = items.find((i) => i.id === selId)
                    if (matched) {
                      setFormBatchCost(matched.unitCost || 50)
                      setFormSupplier(matched.preferredSupplier || "Local Vendor")
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.unit}) — Current: {it.currentStock} {it.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Batch Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formBatchNumber}
                    onChange={(e) => setFormBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 font-mono text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                    placeholder="e.g. RICE-1114-01"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Received Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={formBatchQty}
                    onChange={(e) => setFormBatchQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formBatchCost}
                    onChange={(e) => setFormBatchCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">
                    Expiration Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formBatchExpiry}
                    onChange={(e) => setFormBatchExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Supplier / Vendor</label>
                <input
                  type="text"
                  value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  placeholder="e.g. Amul Dairy, APMC Mandi..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white font-medium text-xs shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm & Receive Batch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Consumption Modal */}
      {showConsumeModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border border-stone-200 shadow-xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-base text-stone-900">Record Stock Consumption</h3>
                <p className="text-xs text-stone-500">FEFO automatically deducts from oldest active batches</p>
              </div>
              <button
                onClick={() => setShowConsumeModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConsumeStock} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Ingredient <span className="text-rose-500">*</span>
                </label>
                <select
                  value={consumeIngId}
                  onChange={(e) => setConsumeIngId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.unit}) — Usable: {it.usableStock || it.currentStock} {it.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Quantity to Issue</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={consumeQty}
                    onChange={(e) => setConsumeQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Reason</label>
                  <select
                    value={consumeReason}
                    onChange={(e) => setConsumeReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                  >
                    <option value="kitchen_prep">Kitchen Prep Shift</option>
                    <option value="catering">Catering Batch</option>
                    <option value="tasting">Tasting / QA</option>
                    <option value="spoilage">Discard / Damaged</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowConsumeModal(false)}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white font-medium text-xs shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Issue & Deduct FEFO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border border-stone-200 shadow-xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-base text-stone-900">Physical Stock Count Audit</h3>
                <p className="text-xs text-stone-500">Correct inventory ledger based on actual count</p>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Ingredient</label>
                <select
                  value={adjustIngId}
                  onChange={(e) => setAdjustIngId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.unit}) — Current Count: {it.currentStock} {it.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Verified Physical Count
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={adjustNewStock}
                  onChange={(e) => setAdjustNewStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white font-medium text-xs shadow-xs flex items-center space-x-1 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Audit Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
