import React, { useState } from "react"
import {
  Boxes,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  ChevronRight,
  ShieldAlert
} from "lucide-react"
import { inventoryItems as initialItems, inventoryBatches } from "../data/mockData"

export const InventoryPage = () => {
  const [items, setItems] = useState(initialItems)
  const [batches, setBatches] = useState(inventoryBatches)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIngredientForBatches, setSelectedIngredientForBatches] = useState(null)
  const [showReceiveModal, setShowReceiveModal] = useState(false)

  // New batch form state
  const [newBatchIngredient, setNewBatchIngredient] = useState("Paneer (Fresh Cottage Cheese)")
  const [newBatchNumber, setNewBatchNumber] = useState("PAN-03")
  const [newBatchQty, setNewBatchQty] = useState(10)
  const [newBatchCost, setNewBatchCost] = useState(320)
  const [newBatchExpiry, setNewBatchExpiry] = useState("2026-11-20")

  const categories = ["all", "Dairy", "Poultry & Meat", "Produce", "Spices", "Grains & Staples", "Oils & Ghee"]

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.preferredSupplier.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesStatus = true
    if (statusFilter === "low") matchesStatus = item.currentStock <= item.reorderPoint
    if (statusFilter === "normal") matchesStatus = item.currentStock > item.reorderPoint

    return matchesCat && matchesSearch && matchesStatus
  })

  // Calculate top metrics
  const totalValuation = items.reduce((sum, it) => sum + it.currentStock * it.unitCost, 0)
  const lowStockCount = items.filter((it) => it.currentStock <= it.reorderPoint).length
  const nearExpiryBatches = batches.filter((b) => b.shelfLifeStatus === "critical" || b.shelfLifeStatus === "warning")

  const handleReceiveStock = (e) => {
    e.preventDefault()
    // Update inventory item current stock
    setItems((prev) =>
      prev.map((it) =>
        it.name === newBatchIngredient ? { ...it, currentStock: it.currentStock + Number(newBatchQty) } : it
      )
    )

    // Add new batch in FEFO order
    const newBatch = {
      id: batches.length + 1,
      batchNumber: newBatchNumber,
      ingredientName: newBatchIngredient,
      quantityRemaining: Number(newBatchQty),
      unit: "kg",
      receivedDate: new Date().toISOString().split("T")[0],
      expiryDate: newBatchExpiry,
      daysToExpiry: 6,
      supplierName: "Amul Dairy Distributors",
      shelfLifeStatus: "fresh",
      financialValueAtRisk: Number(newBatchQty) * Number(newBatchCost),
    }

    setBatches([newBatch, ...batches])
    setShowReceiveModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Smart Inventory Management
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Real-time stock valuation, par levels, and First-Expired, First-Out (FEFO) batch tracking.
          </p>
        </div>

        <button
          onClick={() => setShowReceiveModal(true)}
          className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Receive New Batch (Stock-In)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Stock Valuation</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">
            ₹{totalValuation.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">26 Tracked Raw Ingredients</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Low Stock Items</div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{lowStockCount} SKUs</div>
          <p className="text-[11px] text-amber-800 font-medium mt-1">Below safety par-level threshold</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Near-Expiry Batches</div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{nearExpiryBatches.length} Batches</div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Within 48h shelf life window</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">FEFO Enforcement</div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">100% Active</div>
          <p className="text-[11px] text-stone-500 mt-1">Automatic oldest-batch deduction</p>
        </div>
      </div>

      {/* Controls: Search & Category Tabs */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by ingredient, SKU, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-forest-800"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-500 font-semibold">Stock Status:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === "all" ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700"
              }`}
            >
              All SKUs
            </button>
            <button
              onClick={() => setStatusFilter("low")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === "low" ? "bg-amber-600 text-white" : "bg-warm-100 text-stone-700"
              }`}
            >
              Low Stock Only
            </button>
            <button
              onClick={() => setStatusFilter("normal")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === "normal" ? "bg-forest-700 text-white" : "bg-warm-100 text-stone-700"
              }`}
            >
              Healthy Par
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${
                selectedCategory === cat
                  ? "bg-forest-900 text-gold-400 font-semibold shadow-xs"
                  : "bg-warm-50 text-stone-600 hover:bg-warm-100 border border-warm-200"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="rounded-xl bg-white border border-warm-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-warm-100/70 border-b border-warm-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Ingredient Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Stock on Hand</th>
                <th className="py-3 px-4">Par Level</th>
                <th className="py-3 px-4">Reorder Point</th>
                <th className="py-3 px-4">Unit Cost</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">FEFO Batches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 text-stone-800">
              {filteredItems.map((item) => {
                const isLow = item.currentStock <= item.reorderPoint
                const itemTotalVal = Math.round(item.currentStock * item.unitCost)
                const batchCount = batches.filter((b) => b.ingredientName.toLowerCase() === item.name.toLowerCase()).length

                return (
                  <tr key={item.id} className="hover:bg-warm-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-stone-600">{item.sku}</td>
                    <td className="py-3 px-4 font-semibold text-stone-900">
                      <div>{item.name}</div>
                      <div className="text-[10px] text-stone-400">{item.preferredSupplier}</div>
                    </td>
                    <td className="py-3 px-4 text-stone-500">{item.category}</td>
                    <td className="py-3 px-4 font-mono font-bold text-stone-900 text-sm">
                      {item.currentStock} <span className="text-xs font-normal text-stone-500">{item.unit}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {item.parLevel} {item.unit}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-600">
                      {item.reorderPoint} {item.unit}
                    </td>
                    <td className="py-3 px-4 font-mono">₹{item.unitCost}</td>
                    <td className="py-3 px-4 font-bold text-forest-900">₹{itemTotalVal.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      {isLow ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          Reorder Needed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest-100 text-forest-800 border border-forest-200">
                          Optimal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedIngredientForBatches(item)}
                        className="px-2.5 py-1 rounded bg-warm-100 hover:bg-warm-200 text-stone-800 text-[11px] font-semibold transition"
                      >
                        Inspect ({batchCount})
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FEFO Batch Inspector Section */}
      <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-forest-700" />
              <span>FEFO Batch Expiry Sentinel</span>
            </h2>
            <p className="text-xs text-stone-500">
              All live pantry batches ordered strictly by expiration urgency (First-Expired, First-Out)
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            {nearExpiryBatches.length} Urgent Batches Actionable
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className={`p-4 rounded-xl border transition ${
                batch.shelfLifeStatus === "critical"
                  ? "bg-rose-50/70 border-rose-200 text-rose-950"
                  : batch.shelfLifeStatus === "warning"
                  ? "bg-amber-50/70 border-amber-200 text-amber-950"
                  : "bg-white border-warm-200 text-stone-800"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold">{batch.batchNumber}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    batch.shelfLifeStatus === "critical"
                      ? "bg-rose-600 text-white"
                      : batch.shelfLifeStatus === "warning"
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {batch.daysToExpiry <= 1 ? "Expires Tomorrow" : `${batch.daysToExpiry} Days Left`}
                </span>
              </div>

              <h3 className="font-bold text-sm mt-2">{batch.ingredientName}</h3>
              <div className="text-xs text-stone-600 mt-1 space-y-0.5">
                <div>
                  Remaining: <strong>{batch.quantityRemaining} {batch.unit}</strong>
                </div>
                <div>Expiry Date: <span className="font-mono">{batch.expiryDate}</span></div>
                <div>Supplier: {batch.supplierName}</div>
                {batch.financialValueAtRisk > 0 && (
                  <div className="font-semibold text-rose-700 mt-1">
                    Value at risk: ₹{batch.financialValueAtRisk}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Receive New Batch Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Receive Batch (Stock-In)</h3>
                <p className="text-xs text-stone-500">Record delivery receipt and initiate FEFO tracking</p>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveStock} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Ingredient</label>
                <select
                  value={newBatchIngredient}
                  onChange={(e) => setNewBatchIngredient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.name}>
                      {it.name} ({it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 font-mono"
                    placeholder="e.g. PAN-04"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Received Quantity</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newBatchQty}
                    onChange={(e) => setNewBatchQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    required
                    value={newBatchCost}
                    onChange={(e) => setNewBatchCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={newBatchExpiry}
                    onChange={(e) => setNewBatchExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white font-semibold shadow"
                >
                  Confirm & Receive Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
