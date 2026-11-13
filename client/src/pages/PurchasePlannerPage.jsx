import React, { useState, useEffect } from "react"
import {
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  Send,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Search,
  Check,
  PackageCheck,
  Truck,
  ShieldAlert,
  Info,
  Calendar,
  IndianRupee,
  Utensils
} from "lucide-react"
import { purchaseService, inventoryService } from "../services/api"

export const PurchasePlannerPage = () => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState("recommendations") // 'recommendations' | 'orders' | 'bom'
  const [selectedHorizon, setSelectedHorizon] = useState(3) // 1, 3, 7 days
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Recommendation Engine State
  const [recommendationData, setRecommendationData] = useState(null)
  const [approvedQuantities, setApprovedQuantities] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [onlyReorderFilter, setOnlyReorderFilter] = useState(true)

  // Purchase Orders State
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [poStatusFilter, setPoStatusFilter] = useState("all")
  const [expandedPoId, setExpandedPoId] = useState(null)

  // Master Ingredients (for custom PO form)
  const [ingredientsList, setIngredientsList] = useState([])

  // Modals & Drawers
  const [showAddCustomModal, setShowAddCustomModal] = useState(false)
  const [showCreatePoModal, setShowCreatePoModal] = useState(false)
  const [targetSupplierForPo, setTargetSupplierForPo] = useState("all") // 'all' or supplier name
  const [selectedDishBOM, setSelectedDishBOM] = useState(null)
  const [bomBreakdownModalItem, setBomBreakdownModalItem] = useState(null)
  const [receivingPoId, setReceivingPoId] = useState(null)

  // Custom PO Form State
  const [customPoForm, setCustomPoForm] = useState({
    supplierName: "",
    ingredientId: "",
    quantity: 10,
    unit: "kg",
    unitCost: 50,
    leadTime: "24 hours",
    contact: "+91 98765 43210",
    notes: ""
  })

  // Load recommendations and purchase orders
  const loadData = async (horizon = selectedHorizon) => {
    try {
      setError(null)
      const [recsRes, posRes, ingsRes] = await Promise.all([
        purchaseService.getRecommendations({ days: horizon }),
        purchaseService.getAll(),
        inventoryService.getAll()
      ])

      const recs = recsRes.data
      setRecommendationData(recs)

      // Initialize approved quantities with recommended quantities
      const initialApproved = {}
      if (recs && recs.recommendations) {
        recs.recommendations.forEach((item) => {
          initialApproved[item.ingredientId] = item.recommendedPurchase
        })
      }
      setApprovedQuantities(initialApproved)

      setPurchaseOrders(posRes.data?.data || [])
      setIngredientsList(ingsRes.data?.data || [])

      if (ingsRes.data?.data?.length > 0 && !customPoForm.ingredientId) {
        const first = ingsRes.data.data[0]
        setCustomPoForm((prev) => ({
          ...prev,
          ingredientId: first.id,
          supplierName: first.preferredSupplier || "Metro Cash & Carry",
          unit: first.unit,
          unitCost: first.unitCost
        }))
      }
    } catch (err) {
      console.error("Failed to load purchase planner data:", err)
      setError("Failed to load purchase planner data. Please check your backend connection.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(selectedHorizon)
  }, [selectedHorizon])

  const showNotification = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Handle Horizon Change
  const handleHorizonChange = (days) => {
    setSelectedHorizon(days)
    setRefreshing(true)
  }

  // Handle Approved Quantity Edit
  const handleQuantityChange = (ingredientId, value) => {
    const val = parseFloat(value) || 0
    setApprovedQuantities((prev) => ({
      ...prev,
      [ingredientId]: Math.max(0, val)
    }))
  }

  // Approve / Dispatch PO
  const handleApprovePO = async (poId) => {
    try {
      const res = await purchaseService.update(poId, { status: "ordered" })
      if (res.data?.success) {
        showNotification(`Purchase Order #${poId} approved and marked as 'Ordered'.`)
        // Refresh POs list
        const posRes = await purchaseService.getAll()
        setPurchaseOrders(posRes.data?.data || [])
      }
    } catch (err) {
      alert("Failed to approve PO: " + (err.response?.data?.message || err.message))
    }
  }

  // Receive Delivery from PO into Inventory Batches
  const handleReceivePO = async (poId) => {
    setReceivingPoId(poId)
    try {
      const res = await purchaseService.receive(poId)
      if (res.data?.success) {
        showNotification(
          `Delivery for PO #${poId} received! Active inventory batches created and stock updated.`
        )
        // Refresh both recommendations and POs list
        await loadData(selectedHorizon)
      }
    } catch (err) {
      alert("Failed to receive delivery: " + (err.response?.data?.message || err.message))
    } finally {
      setReceivingPoId(null)
    }
  }

  // Submit Draft Purchase Order from AI Recommendations
  const handleCreatePOFromRecommendations = async (e) => {
    e.preventDefault()
    if (!recommendationData?.recommendations) return

    // Collect all items where approvedQuantity > 0
    let itemsToOrder = recommendationData.recommendations
      .filter((rec) => {
        const approved = approvedQuantities[rec.ingredientId] || 0
        return approved > 0
      })
      .map((rec) => ({
        ingredientId: rec.ingredientId,
        recommendedPurchase: rec.recommendedPurchase,
        approvedQuantity: approvedQuantities[rec.ingredientId] || rec.recommendedPurchase,
        unit: rec.unit,
        unitCost: rec.unitCost,
        requiredQuantity: rec.requiredQuantity,
        usableStock: rec.usableStock,
        preferredSupplier: rec.preferredSupplier
      }))

    if (targetSupplierForPo !== "all") {
      itemsToOrder = itemsToOrder.filter((it) => it.preferredSupplier === targetSupplierForPo)
    }

    if (itemsToOrder.length === 0) {
      alert("No items selected with approved quantity > 0.")
      return
    }

    try {
      const supplierName =
        targetSupplierForPo !== "all" ? targetSupplierForPo : "Consolidated Suppliers"
      const res = await purchaseService.create({
        supplierName,
        leadTime: "24-48 hours",
        contact: "+91 98765 43210",
        notes: `AI Demand-Driven Purchase Order for next ${selectedHorizon} days forecast.`,
        items: itemsToOrder
      })

      if (res.data?.success) {
        showNotification(
          `Draft PO ${res.data.data.poNumber} generated with ${itemsToOrder.length} line items.`
        )
        setShowCreatePoModal(false)
        setActiveTab("orders")
        const posRes = await purchaseService.getAll()
        setPurchaseOrders(posRes.data?.data || [])
      }
    } catch (err) {
      alert("Failed to create PO: " + (err.response?.data?.message || err.message))
    }
  }

  // Create Ad-Hoc / Custom PO
  const handleCreateCustomPO = async (e) => {
    e.preventDefault()
    const ing = ingredientsList.find((i) => i.id === parseInt(customPoForm.ingredientId))
    if (!ing) return

    try {
      const res = await purchaseService.create({
        supplierName: customPoForm.supplierName || ing.preferredSupplier || "Local Vendor",
        leadTime: customPoForm.leadTime,
        contact: customPoForm.contact,
        notes: customPoForm.notes || "Ad-hoc manual purchase order",
        items: [
          {
            ingredientId: ing.id,
            recommendedPurchase: customPoForm.quantity,
            approvedQuantity: customPoForm.quantity,
            unit: customPoForm.unit,
            unitCost: customPoForm.unitCost,
            requiredQuantity: 0.0,
            usableStock: ing.currentStock || 0.0
          }
        ]
      })

      if (res.data?.success) {
        showNotification(`Custom PO ${res.data.data.poNumber} created successfully.`)
        setShowAddCustomModal(false)
        setActiveTab("orders")
        const posRes = await purchaseService.getAll()
        setPurchaseOrders(posRes.data?.data || [])
      }
    } catch (err) {
      alert("Failed to create custom PO: " + (err.response?.data?.message || err.message))
    }
  }

  // Calculate live procurement cost based on user-approved quantities
  const liveTotalApprovedCost = recommendationData?.recommendations
    ? recommendationData.recommendations.reduce((sum, item) => {
        const approved = approvedQuantities[item.ingredientId] ?? item.recommendedPurchase
        return sum + approved * item.unitCost
      }, 0)
    : 0

  // Filter recommendations
  const filteredRecommendations = (recommendationData?.recommendations || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.preferredSupplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesReorder = onlyReorderFilter ? item.recommendedPurchase > 0 : true
    return matchesSearch && matchesCategory && matchesReorder
  })

  // Filter Purchase Orders
  const filteredPOs = purchaseOrders.filter((po) => {
    if (poStatusFilter === "all") return true
    return po.status?.toLowerCase() === poStatusFilter.toLowerCase()
  })

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Smart Purchase Planner
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-100 text-gold-900 border border-gold-300 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-gold-600" />
              <span>AI Demand Driven</span>
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Deficit Formula:{" "}
            <code className="text-forest-800 font-mono text-xs bg-warm-100 px-1 py-0.5 rounded">
              Purchase Qty = Max(0, Required Qty + Safety Stock - Usable Stock)
            </code>
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => {
              setRefreshing(true)
              loadData(selectedHorizon)
            }}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-forest-700" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddCustomModal(true)}
            className="px-3.5 py-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-800 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-stone-600" />
            <span>Add Custom PO</span>
          </button>

          <button
            onClick={() => {
              setTargetSupplierForPo("all")
              setShowCreatePoModal(true)
            }}
            className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-gold-400" />
            <span>Generate PO from Deficit</span>
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

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Approved Procurement</span>
            <IndianRupee className="w-4 h-4 text-gold-600" />
          </div>
          <div className="text-2xl font-bold text-forest-900 mt-2">
            ₹{liveTotalApprovedCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Across next {selectedHorizon} days forecast horizon
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">SKUs Needing Reorder</span>
            <ShoppingCart className="w-4 h-4 text-forest-700" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            {recommendationData?.itemsNeedingReorder ?? 0} SKUs
          </div>
          <p className="text-[11px] text-amber-800 font-medium mt-1">
            Based on Safety Stock & Expected Consumption
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Shortages</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            {recommendationData?.urgentAlertsCount ?? 0} Urgent
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">
            Usable stock strictly below forecasted need
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Forecasted Demand</span>
            <Utensils className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            {recommendationData?.totalForecastedPortions ?? 0} Portions
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Recipe BOM exploded across 8 active dishes
          </p>
        </div>
      </div>

      {/* Demand Horizon Selector & Primary Tabs */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 bg-warm-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("recommendations")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "recommendations"
                ? "bg-forest-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            AI Recommendations ({recommendationData?.recommendations?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "orders"
                ? "bg-forest-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("bom")}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === "bom"
                ? "bg-forest-900 text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Recipe BOM Explorer
          </button>
        </div>

        {/* Calculation Horizon Buttons */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-stone-500 font-medium hidden sm:inline">Calculation Horizon:</span>
          <button
            onClick={() => handleHorizonChange(1)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedHorizon === 1
                ? "bg-forest-900 text-white shadow-xs"
                : "bg-warm-100 text-stone-700 hover:bg-warm-200"
            }`}
          >
            24 Hours
          </button>
          <button
            onClick={() => handleHorizonChange(3)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedHorizon === 3
                ? "bg-forest-900 text-white shadow-xs"
                : "bg-warm-100 text-stone-700 hover:bg-warm-200"
            }`}
          >
            Next 3 Days (Recommended)
          </button>
          <button
            onClick={() => handleHorizonChange(7)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedHorizon === 7
                ? "bg-forest-900 text-white shadow-xs"
                : "bg-warm-100 text-stone-700 hover:bg-warm-200"
            }`}
          >
            7 Days Buffer
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: RECOMMENDATIONS ===================== */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ingredient or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-lg bg-warm-50 border border-warm-200 focus:outline-hidden focus:border-forest-600 text-xs w-48 sm:w-64"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-stone-700 focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                <option value="Grains & Flours">Grains & Flours</option>
                <option value="Dairy & Milk">Dairy & Milk</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Spices & Oils">Spices & Oils</option>
                <option value="Bakery">Bakery</option>
                <option value="Beverages">Beverages</option>
              </select>

              <label className="flex items-center space-x-1.5 text-stone-700 font-medium cursor-pointer ml-1">
                <input
                  type="checkbox"
                  checked={onlyReorderFilter}
                  onChange={(e) => setOnlyReorderFilter(e.target.checked)}
                  className="rounded text-forest-900 focus:ring-forest-600 w-3.5 h-3.5"
                />
                <span>Show only items needing reorder</span>
              </label>
            </div>

            <div className="text-right text-stone-500 font-medium">
              Showing {filteredRecommendations.length} of {recommendationData?.recommendations?.length || 0} SKUs
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-warm-50 text-stone-600 border-y border-warm-200 font-semibold text-[11px]">
                    <th className="py-3 px-3">Ingredient</th>
                    <th className="py-3 px-3">Preferred Supplier</th>
                    <th className="py-3 px-3">Usable Stock</th>
                    <th className="py-3 px-3">Forecasted Need</th>
                    <th className="py-3 px-3">Safety Stock</th>
                    <th className="py-3 px-3 text-forest-900 font-bold">AI Recommended</th>
                    <th className="py-3 px-3 text-forest-900 font-bold">Approved Order Qty</th>
                    <th className="py-3 px-3">Unit Price</th>
                    <th className="py-3 px-3 text-right">Est. Subtotal</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100 text-stone-800">
                  {filteredRecommendations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-stone-400">
                        No ingredients match your current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecommendations.map((item) => {
                      const approved = approvedQuantities[item.ingredientId] ?? item.recommendedPurchase
                      const subtotal = approved * item.unitCost

                      return (
                        <tr key={item.ingredientId} className="hover:bg-warm-50/50 transition">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-stone-900">{item.name}</div>
                            <div className="text-[10px] text-stone-400 font-mono">
                              {item.sku} • {item.category}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-stone-600 font-medium">
                            {item.preferredSupplier}
                          </td>

                          <td className="py-3 px-3 font-mono">
                            <div className="font-semibold text-stone-900">
                              {item.usableStock} {item.unit}
                            </div>
                            {item.expiredStock > 0 && (
                              <div className="text-[10px] text-rose-600 font-medium">
                                Excluded: {item.expiredStock} {item.unit} (expired)
                              </div>
                            )}
                            {item.hasNearExpiry && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 border border-amber-300">
                                Near Expiry Batch
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-stone-800">
                                {item.requiredQuantity} {item.unit}
                              </span>
                              {item.contributingDishes && item.contributingDishes.length > 0 && (
                                <button
                                  onClick={() => setBomBreakdownModalItem(item)}
                                  className="text-[10px] text-forest-700 hover:text-forest-900 underline cursor-pointer"
                                  title="View dish breakdown"
                                >
                                  ({item.contributingDishes.length} dishes)
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-stone-500">
                            {item.safetyStock} {item.unit}
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-forest-900">
                            {item.recommendedPurchase} {item.unit}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={approved}
                                onChange={(e) =>
                                  handleQuantityChange(item.ingredientId, e.target.value)
                                }
                                className="w-20 px-2 py-1 rounded-lg bg-warm-50 border border-warm-300 text-stone-900 font-mono font-bold text-xs focus:outline-hidden focus:border-forest-600"
                              />
                              <span className="text-[11px] text-stone-500 font-mono">{item.unit}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 font-mono text-stone-600">
                            ₹{item.unitCost}
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-stone-900 text-right">
                            ₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {item.status === "out_of_stock" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                Out of Stock
                              </span>
                            )}
                            {item.status === "critical_shortage" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                Critical Deficit
                              </span>
                            )}
                            {item.status === "low_stock" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                Low Stock
                              </span>
                            )}
                            {item.status === "sufficient" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Sufficient
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className="mt-4 pt-4 border-t border-warm-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-500">
                Purchase recommendations calculate automatically based on BOM recipe explosion and FEFO stock levels.
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Approved Order Total</div>
                  <div className="text-lg font-black text-forest-900">
                    ₹{liveTotalApprovedCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTargetSupplierForPo("all")
                    setShowCreatePoModal(true)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-gold-400" />
                  <span>Create Consolidated PO</span>
                </button>
              </div>
            </div>
          </div>

          {/* Supplier Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(recommendationData?.bySupplier || []).map((grp) => {
              const itemsNeedingOrder = grp.items.filter(
                (i) => (approvedQuantities[i.ingredientId] ?? i.recommendedPurchase) > 0
              )
              const supplierSubtotal = itemsNeedingOrder.reduce((sum, i) => {
                const qty = approvedQuantities[i.ingredientId] ?? i.recommendedPurchase
                return sum + qty * i.unitCost
              }, 0)

              return (
                <div
                  key={grp.supplierName}
                  className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">{grp.supplierName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warm-100 text-stone-700">
                        {grp.items.length} Tracked SKUs
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-stone-500">
                      <div>Items to order: <strong className="text-forest-900">{itemsNeedingOrder.length}</strong></div>
                      <div>Est. Total: <strong className="text-forest-900">₹{supplierSubtotal.toLocaleString("en-IN")}</strong></div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-warm-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400">Lead time ~24h</span>
                    <button
                      onClick={() => {
                        setTargetSupplierForPo(grp.supplierName)
                        setShowCreatePoModal(true)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-warm-100 hover:bg-forest-900 hover:text-white text-forest-900 text-[11px] font-semibold transition cursor-pointer"
                    >
                      Draft Supplier PO
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: PURCHASE ORDERS & DELIVERIES ===================== */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-stone-600">Filter Status:</span>
              {["all", "draft", "ordered", "received"].map((status) => (
                <button
                  key={status}
                  onClick={() => setPoStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition ${
                    poStatusFilter === status
                      ? "bg-forest-900 text-white"
                      : "bg-warm-100 text-stone-600 hover:bg-warm-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="text-stone-500">
              Showing {filteredPOs.length} Purchase Orders
            </div>
          </div>

          {/* PO List */}
          {filteredPOs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-warm-200 shadow-card">
              <PackageCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">No Purchase Orders Found</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Generate purchase orders from AI recommendations to replenish stock deficits.
              </p>
              <button
                onClick={() => setActiveTab("recommendations")}
                className="mt-4 px-4 py-2 rounded-lg bg-forest-900 text-white text-xs font-semibold"
              >
                Go to Recommendations
              </button>
            </div>
          ) : (
            filteredPOs.map((po) => {
              const isExpanded = expandedPoId === po.id
              const isDraft = po.status?.toLowerCase() === "draft"
              const isOrdered = po.status?.toLowerCase() === "ordered" || po.status?.toLowerCase() === "sent"
              const isReceived = po.status?.toLowerCase() === "received"

              return (
                <div
                  key={po.id}
                  className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-warm-100">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-forest-900">{po.poNumber}</span>
                        {isDraft && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-100 text-gold-900 border border-gold-300">
                            Draft Recommendation
                          </span>
                        )}
                        {isOrdered && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300 flex items-center space-x-1">
                            <Truck className="w-3 h-3 text-blue-700" />
                            <span>Ordered / Dispatched</span>
                          </span>
                        )}
                        {isReceived && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Received & Stocked</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-stone-900 mt-1">{po.supplierName}</h3>
                      <div className="text-xs text-stone-500 flex flex-wrap items-center gap-3 mt-1">
                        <span>Ordered: {po.orderDate}</span>
                        <span>•</span>
                        <span>Delivery Due: {po.deliveryDueDate}</span>
                        {po.contact && (
                          <>
                            <span>•</span>
                            <span>Contact: {po.contact}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Lead Time: {po.leadTime}</span>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <div className="text-[10px] uppercase font-bold text-stone-400">Total Procurement Value</div>
                      <div className="text-xl font-black text-forest-900">
                        ₹{po.totalEstimatedCost.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Items View */}
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                      className="text-stone-600 hover:text-stone-900 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{po.items?.length || 0} Line Items</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="text-stone-400 text-[11px]">
                      {po.notes && <span>Notes: {po.notes}</span>}
                    </div>
                  </div>

                  {/* Expandable Line Items Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-warm-100 pt-3">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-warm-50 text-stone-600 border-y border-warm-200 font-semibold text-[11px]">
                            <th className="py-2 px-3">Ingredient</th>
                            <th className="py-2 px-3">Forecasted Need</th>
                            <th className="py-2 px-3">Stock at Order</th>
                            <th className="py-2 px-3 font-bold text-forest-900">Approved Qty</th>
                            <th className="py-2 px-3">Unit Cost</th>
                            <th className="py-2 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-warm-100 text-stone-800">
                          {(po.items || []).map((it, idx) => (
                            <tr key={idx} className="hover:bg-warm-50/50">
                              <td className="py-2 px-3 font-semibold text-stone-900">
                                {it.ingredientName}
                              </td>
                              <td className="py-2 px-3 font-mono text-stone-600">
                                {it.forecastedDemand} {it.unit}
                              </td>
                              <td className="py-2 px-3 font-mono text-stone-600">
                                {it.currentStock} {it.unit}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-forest-900">
                                {it.approvedQuantity} {it.unit}
                              </td>
                              <td className="py-2 px-3 font-mono">₹{it.unitCost}</td>
                              <td className="py-2 px-3 font-bold text-stone-900 text-right">
                                ₹{it.subtotal.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-warm-100">
                    <div className="text-xs text-stone-500">
                      {isReceived ? (
                        <span className="text-emerald-700 font-medium flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Delivered & intake into inventory batches completed.</span>
                        </span>
                      ) : isOrdered ? (
                        <span className="text-blue-800 font-medium">
                          Awaiting physical shipment from vendor. Click "Receive Stock Delivery" upon arrival.
                        </span>
                      ) : (
                        <span>Draft status. Review quantities and approve to dispatch purchase order.</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print PO</span>
                      </button>

                      {isDraft && (
                        <button
                          onClick={() => handleApprovePO(po.id)}
                          className="px-4 py-1.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-gold-400" />
                          <span>Approve & Dispatch</span>
                        </button>
                      )}

                      {isOrdered && (
                        <button
                          onClick={() => handleReceivePO(po.id)}
                          disabled={receivingPoId === po.id}
                          className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <PackageCheck className="w-3.5 h-3.5 text-emerald-200" />
                          <span>
                            {receivingPoId === po.id ? "Intaking Stock..." : "Receive Delivery"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ===================== TAB 3: RECIPE BOM EXPLORER ===================== */}
      {activeTab === "bom" && (
        <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4">
          <div>
            <h3 className="font-bold text-base text-forest-900">
              Recipe Bill of Materials (BOM) & Demand Explosion
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Explore how menu portions forecast translates into raw ingredient purchasing needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(recommendationData?.recommendations || [])
              .filter((item) => item.contributingDishes && item.contributingDishes.length > 0)
              .map((item) => (
                <div
                  key={item.ingredientId}
                  className="p-4 rounded-xl bg-warm-50 border border-warm-200 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-900">{item.name}</span>
                      <span className="text-[10px] text-stone-500 ml-2">({item.category})</span>
                    </div>
                    <span className="font-mono font-bold text-forest-900">
                      Total Need: {item.requiredQuantity} {item.unit}
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-600 font-medium">Contributing Dishes:</div>
                  <div className="space-y-1">
                    {item.contributingDishes.map((dish, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-warm-100"
                      >
                        <div>
                          <span className="font-semibold text-stone-800">{dish.dishName}</span>
                          <span className="text-stone-400 text-[10px] ml-1.5">
                            ({dish.portions} portions × {dish.portionQuantity} {dish.recipeUnit}/portion)
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-stone-700">
                          {dish.dishRequirement} {dish.baseUnit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ===================== MODAL: BOM DISH BREAKDOWN ===================== */}
      {bomBreakdownModalItem && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-base text-forest-900">
                  {bomBreakdownModalItem.name} — Demand Breakdown
                </h3>
                <p className="text-stone-500 text-[11px]">
                  Forecasted portion consumption across menu items for {selectedHorizon} days
                </p>
              </div>
              <button
                onClick={() => setBomBreakdownModalItem(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {(bomBreakdownModalItem.contributingDishes || []).map((dish, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-warm-50 border border-warm-200 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-stone-900 text-sm">{dish.dishName}</div>
                    <div className="text-stone-500 text-[11px] mt-0.5">
                      Forecasted Sales: <strong>{dish.portions} portions</strong>
                    </div>
                    <div className="text-stone-400 text-[10px]">
                      Recipe Serving: {dish.portionQuantity} {dish.recipeUnit}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-stone-400">Required Stock</div>
                    <div className="text-base font-bold text-forest-900 font-mono">
                      {dish.dishRequirement} {dish.baseUnit}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-warm-200 flex justify-between items-center text-xs">
              <span className="font-semibold text-stone-600">Total Exploded Need:</span>
              <span className="font-bold text-sm text-forest-900 font-mono">
                {bomBreakdownModalItem.requiredQuantity} {bomBreakdownModalItem.unit}
              </span>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setBomBreakdownModalItem(null)}
                className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: GENERATE CONSOLIDATED PO ===================== */}
      {showCreatePoModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Generate Purchase Order</h3>
                <p className="text-stone-500">
                  {targetSupplierForPo === "all"
                    ? "Consolidated PO across all suppliers"
                    : `PO for supplier: ${targetSupplierForPo}`}
                </p>
              </div>
              <button
                onClick={() => setShowCreatePoModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-warm-50 border border-warm-200 text-stone-700">
                <div className="font-semibold">Review Order Summary:</div>
                <div className="mt-1 flex justify-between text-xs">
                  <span>Forecast Horizon:</span>
                  <span className="font-bold">{selectedHorizon} Days</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Selected Supplier:</span>
                  <span className="font-bold">{targetSupplierForPo}</span>
                </div>
                <div className="flex justify-between text-xs mt-1 pt-1 border-t border-warm-200">
                  <span>Estimated Total Amount:</span>
                  <span className="font-bold text-forest-900 text-sm">
                    ₹{liveTotalApprovedCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500">
                * Note: All items with Approved Quantity &gt; 0 will be included in the draft purchase order. You can review, print, and approve the PO in the Purchase Orders tab.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-warm-200 mt-4">
              <button
                type="button"
                onClick={() => setShowCreatePoModal(false)}
                className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePOFromRecommendations}
                className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white font-semibold shadow cursor-pointer"
              >
                Confirm & Create Draft PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ADD CUSTOM SUPPLIER PO ===================== */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Custom Purchase Order</h3>
                <p className="text-stone-500">Create an ad-hoc purchase request for spot buys</p>
              </div>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomPO} className="mt-4 space-y-3">
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Select Ingredient</label>
                <select
                  value={customPoForm.ingredientId}
                  onChange={(e) => {
                    const id = e.target.value
                    const ing = ingredientsList.find((i) => i.id === parseInt(id))
                    setCustomPoForm((prev) => ({
                      ...prev,
                      ingredientId: id,
                      supplierName: ing?.preferredSupplier || prev.supplierName,
                      unit: ing?.unit || prev.unit,
                      unitCost: ing?.unitCost || prev.unitCost
                    }))
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                >
                  {ingredientsList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({inv.unit}) — Usable: {inv.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={customPoForm.supplierName}
                  onChange={(e) =>
                    setCustomPoForm((prev) => ({ ...prev, supplierName: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Order Quantity</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    required
                    value={customPoForm.quantity}
                    onChange={(e) =>
                      setCustomPoForm((prev) => ({
                        ...prev,
                        quantity: parseFloat(e.target.value) || 0
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={customPoForm.unitCost}
                    onChange={(e) =>
                      setCustomPoForm((prev) => ({
                        ...prev,
                        unitCost: parseFloat(e.target.value) || 0
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Lead Time</label>
                  <input
                    type="text"
                    value={customPoForm.leadTime}
                    onChange={(e) =>
                      setCustomPoForm((prev) => ({ ...prev, leadTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Supplier Contact</label>
                  <input
                    type="text"
                    value={customPoForm.contact}
                    onChange={(e) =>
                      setCustomPoForm((prev) => ({ ...prev, contact: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={customPoForm.notes}
                  onChange={(e) =>
                    setCustomPoForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Special storage or delivery instructions..."
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-warm-200">
                <div className="text-xs">
                  Subtotal: <strong className="text-forest-900">₹{(customPoForm.quantity * customPoForm.unitCost).toLocaleString("en-IN")}</strong>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-800 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-forest-900 text-white font-semibold shadow cursor-pointer"
                  >
                    Create Draft PO
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
