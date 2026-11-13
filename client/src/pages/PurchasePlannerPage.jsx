import React, { useState } from "react"
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
  X
} from "lucide-react"
import { purchaseOrdersList as initialPOs, inventoryItems } from "../data/mockData"

export const PurchasePlannerPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPOs)
  const [selectedHorizon, setSelectedHorizon] = useState("3days")
  const [approvedSuccess, setApprovedSuccess] = useState(null)
  const [showAddCustomModal, setShowAddCustomModal] = useState(false)

  const totalEstimatedCost = purchaseOrders.reduce((sum, po) => sum + po.totalEstimatedCost, 0)
  const pendingOrdersCount = purchaseOrders.filter((po) => po.status === "draft").length

  const handleApprovePO = (poId) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === poId ? { ...po, status: "sent" } : po))
    )
    setApprovedSuccess(poId)
    setTimeout(() => setApprovedSuccess(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Smart Purchase Planner
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gold-100 text-gold-800 border border-gold-300">
              AI Demand Driven
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Automated shortage calculation: <em>(Forecasted Demand × Recipe BOM) - Current Stock + Safety Buffer</em>.
          </p>
        </div>

        <button
          onClick={() => setShowAddCustomModal(true)}
          className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Add Custom Supplier PO</span>
        </button>
      </div>

      {approvedSuccess && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
          <span>
            Purchase Order <strong>{approvedSuccess}</strong> approved and queued for supplier dispatch!
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Recommended POs</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{purchaseOrders.length} Orders</div>
          <p className="text-[11px] text-amber-800 font-medium mt-1">
            {pendingOrdersCount} Awaiting Manager Approval
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Procurement Cost</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">
            ₹{totalEstimatedCost.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Based on next 72-hour forecast</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Urgent Shortages</div>
          <div className="text-2xl font-bold text-rose-600 mt-2">3 SKUs Critical</div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Stockout risk before weekend</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Bulk Savings Identified</div>
          <div className="text-2xl font-bold text-gold-700 mt-2">₹1,200 Savings</div>
          <p className="text-[11px] text-stone-500 mt-1">Via combined supplier lots</p>
        </div>
      </div>

      {/* Demand Horizon Selector */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs">
          <Sparkles className="w-4 h-4 text-gold-600" />
          <span className="font-semibold text-stone-800">Calculation Horizon:</span>
          <span className="text-stone-500">How far ahead should the AI calculate ingredient requirements?</span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setSelectedHorizon("24h")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedHorizon === "24h" ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700"
            }`}
          >
            Next 24 Hours
          </button>
          <button
            onClick={() => setSelectedHorizon("3days")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedHorizon === "3days" ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700"
            }`}
          >
            Next 3 Days (Recommended)
          </button>
          <button
            onClick={() => setSelectedHorizon("weekend")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              selectedHorizon === "weekend" ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700"
            }`}
          >
            Weekend Surge Buffer
          </button>
        </div>
      </div>

      {/* Supplier-Grouped PO Cards */}
      <div className="space-y-4">
        {purchaseOrders.map((po) => {
          const isSent = po.status === "sent"

          return (
            <div
              key={po.id}
              className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-warm-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-forest-900">{po.poNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isSent
                          ? "bg-forest-100 text-forest-800 border border-forest-200"
                          : "bg-gold-100 text-gold-800 border border-gold-200"
                      }`}
                    >
                      {isSent ? "Dispatched / Approved" : "Draft Recommendation"}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-stone-900 mt-0.5">{po.supplierName}</h3>
                  <div className="text-xs text-stone-500 flex items-center space-x-3 mt-0.5">
                    <span>Contact: {po.contact}</span>
                    <span>•</span>
                    <span>Lead Time: {po.leadTime}</span>
                  </div>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Order Subtotal</div>
                  <div className="text-xl font-black text-forest-900">
                    ₹{po.totalEstimatedCost.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-warm-50 text-stone-600 border-y border-warm-200 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Ingredient</th>
                      <th className="py-2.5 px-3">Forecasted Need</th>
                      <th className="py-2.5 px-3">Current Stock</th>
                      <th className="py-2.5 px-3 font-bold text-forest-900">Recommended Order</th>
                      <th className="py-2.5 px-3">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100 text-stone-800">
                    {po.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-warm-50/50">
                        <td className="py-2.5 px-3 font-semibold text-stone-900">
                          {item.ingredientName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">
                          {item.forecastedDemand} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-forest-900">
                          {item.recommendedPurchase} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono">₹{item.unitCost}</td>
                        <td className="py-2.5 px-3 font-bold text-stone-900 text-right">
                          ₹{item.subtotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer actions */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-warm-100">
                <div className="text-xs text-stone-500">
                  Calculated using verified Bill of Materials for expected weekend peak volume.
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <button
                    onClick={() => alert(`Generated PDF Summary for ${po.poNumber}`)}
                    className="px-3 py-1.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PDF</span>
                  </button>

                  {!isSent && (
                    <button
                      onClick={() => handleApprovePO(po.id)}
                      className="px-4 py-1.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-gold-400" />
                      <span>Approve & Send PO</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Custom PO Modal */}
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
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setShowAddCustomModal(false)
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  defaultValue="Metro Cash & Carry"
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Item to Order</label>
                <select className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200">
                  {inventoryItems.map((inv) => (
                    <option key={inv.id} value={inv.name}>
                      {inv.name} ({inv.unit}) — Current: {inv.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    defaultValue="25"
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    required
                    defaultValue="2500"
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-forest-900 text-white font-semibold shadow"
                >
                  Create Draft PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
