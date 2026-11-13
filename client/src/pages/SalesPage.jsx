import React, { useState } from "react"
import {
  Receipt,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  ChefHat
} from "lucide-react"
import { salesOrders as initialOrders, menuCatalog } from "../data/mockData"

export const SalesPage = () => {
  const [orders, setOrders] = useState(initialOrders)
  const [searchQuery, setSearchQuery] = useState("")
  const [channelFilter, setChannelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)

  // New order form state
  const [newOrderChannel, setNewOrderChannel] = useState("Dine-in")
  const [newOrderTable, setNewOrderTable] = useState("Table 5")
  const [newOrderCustomer, setNewOrderCustomer] = useState("")
  const [newOrderPayment, setNewOrderPayment] = useState("UPI")
  const [selectedItems, setSelectedItems] = useState([
    { menuItemId: 1, quantity: 2 },
    { menuItemId: 3, quantity: 2 },
  ])

  // Filtered orders
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ord.tableNumber && ord.tableNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ord.items.some((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesChannel =
      channelFilter === "all" || ord.channel.toLowerCase() === channelFilter.toLowerCase()

    const matchesStatus =
      statusFilter === "all" || ord.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesChannel && matchesStatus
  })

  // Quick stats
  const totalRevenue = orders.reduce((sum, ord) => sum + (ord.status !== "Cancelled" ? ord.totalAmount : 0), 0)
  const completedOrders = orders.filter((o) => o.status === "Completed").length
  const avgTicketSize = Math.round(totalRevenue / (orders.length || 1))

  const handleAddItemToForm = (menuItemId) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId)
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { menuItemId, quantity: 1 }]
    })
  }

  const handleRemoveItemFromForm = (menuItemId) => {
    setSelectedItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId))
  }

  const handleUpdateItemQty = (menuItemId, qty) => {
    if (qty <= 0) {
      handleRemoveItemFromForm(menuItemId)
    } else {
      setSelectedItems((prev) =>
        prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: qty } : i))
      )
    }
  }

  // Calculate order subtotal
  const formSubtotal = selectedItems.reduce((sum, item) => {
    const itemData = menuCatalog.find((m) => m.id === item.menuItemId)
    return sum + (itemData ? itemData.price * item.quantity : 0)
  }, 0)
  const formTax = Math.round(formSubtotal * 0.05)
  const formGrandTotal = formSubtotal + formTax

  const handleCreateOrder = (e) => {
    e.preventDefault()
    if (selectedItems.length === 0) return

    const constructedItems = selectedItems.map((sel) => {
      const itemData = menuCatalog.find((m) => m.id === sel.menuItemId)
      return {
        menuItemId: sel.menuItemId,
        name: itemData?.name || "Custom Item",
        quantity: sel.quantity,
        unitPrice: itemData?.price || 100,
        subtotal: (itemData?.price || 100) * sel.quantity,
      }
    })

    const newOrderObj = {
      id: orders.length + 1,
      orderNumber: `ORD-${1040 + orders.length + 1}`,
      channel: newOrderChannel,
      tableNumber: newOrderChannel === "Dine-in" ? newOrderTable : null,
      customerName: newOrderCustomer || "Walk-in Guest",
      paymentMethod: newOrderPayment,
      status: "In-Kitchen",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      items: constructedItems,
      subtotal: formSubtotal,
      tax: formTax,
      totalAmount: formGrandTotal,
    }

    setOrders([newOrderObj, ...orders])
    setShowNewOrderModal(false)
    // reset form
    setSelectedItems([{ menuItemId: 1, quantity: 1 }])
    setNewOrderCustomer("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Sales & POS Management
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Real-time orders, bill generation, and automatic FEFO ingredient stock deductions.
          </p>
        </div>

        <button
          onClick={() => setShowNewOrderModal(true)}
          className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>New POS Order</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Orders Today</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{orders.length}</div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {completedOrders} Served • {orders.filter((o) => o.status === "In-Kitchen").length} In Kitchen
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Sales Turnover</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">+14.2% vs previous Sunday</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Average Ticket Size</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            ₹{avgTicketSize.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Avg 2.6 items per ticket</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Top Selling Category</div>
          <div className="text-2xl font-bold text-gold-700 mt-2">Biryani & Mains</div>
          <p className="text-[11px] text-stone-500 mt-1">42% of gross revenue</p>
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Table #, or Dish name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-900/10 focus:border-forest-800 transition"
            />
          </div>

          {/* Channel Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-500 font-semibold shrink-0">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-800 text-xs focus:outline-none focus:border-forest-800"
            >
              <option value="all">All Channels</option>
              <option value="Dine-in">Dine-in</option>
              <option value="Takeaway">Takeaway</option>
              <option value="Online">Online Delivery</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-500 font-semibold shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-800 text-xs focus:outline-none focus:border-forest-800"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In-Kitchen">In-Kitchen</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="rounded-xl bg-white border border-warm-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-warm-100/70 border-b border-warm-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Channel & Table</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100 text-stone-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400">
                    No orders found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-warm-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-forest-900">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-stone-500 font-mono">{ord.time}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-900">{ord.channel}</span>
                      {ord.tableNumber && (
                        <span className="ml-1.5 text-stone-500 text-[11px]">({ord.tableNumber})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-700">{ord.customerName}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-stone-600">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 font-mono text-[11px] bg-warm-100 px-2 py-0.5 rounded border border-warm-200">
                        {ord.paymentMethod === "UPI" ? (
                          <QrCode className="w-3 h-3 text-forest-700" />
                        ) : ord.paymentMethod === "Cash" ? (
                          <Banknote className="w-3 h-3 text-gold-700" />
                        ) : (
                          <CreditCard className="w-3 h-3 text-stone-600" />
                        )}
                        <span>{ord.paymentMethod}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      ₹{ord.totalAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ord.status === "Completed"
                            ? "bg-forest-100 text-forest-800 border border-forest-200"
                            : ord.status === "In-Kitchen"
                            ? "bg-gold-100 text-gold-800 border border-gold-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="px-2.5 py-1 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 text-[11px] font-semibold transition inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">
                  Order Details — {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedOrder.channel} • {selectedOrder.tableNumber || "No Table"} • {selectedOrder.time}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-warm-50 p-3 rounded-xl border border-warm-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer:</span>
                  <span className="font-semibold text-stone-900">{selectedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Payment Mode:</span>
                  <span className="font-semibold text-stone-900">{selectedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-bold text-forest-800">{selectedOrder.status}</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Ordered Dishes
                </h4>
                <div className="divide-y divide-warm-100 border border-warm-200 rounded-xl overflow-hidden text-xs">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between bg-white">
                      <div>
                        <span className="font-semibold text-stone-900">{it.name}</span>
                        <span className="text-stone-400 ml-2">x {it.quantity}</span>
                      </div>
                      <span className="font-bold text-stone-900">₹{it.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill totals */}
              <div className="bg-warm-100/70 p-3 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>GST (5%):</span>
                  <span>₹{selectedOrder.tax}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-forest-900 pt-1.5 border-t border-warm-200">
                  <span>Grand Total:</span>
                  <span>₹{selectedOrder.totalAmount}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 text-xs text-forest-900">
                <div className="font-semibold flex items-center space-x-1">
                  <ChefHat className="w-3.5 h-3.5 text-forest-700" />
                  <span>FEFO Inventory Decrement:</span>
                </div>
                <p className="text-[11px] text-forest-800 mt-0.5">
                  Ingredients deduced according to standard Bill of Materials from the oldest active batches.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-warm-200 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Create New POS Order</h3>
                <p className="text-xs text-stone-500">Record a live dining or takeaway bill</p>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Channel</label>
                  <select
                    value={newOrderChannel}
                    onChange={(e) => setNewOrderChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  >
                    <option value="Dine-in">Dine-in</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Online">Online Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">
                    {newOrderChannel === "Dine-in" ? "Table Number" : "Token / Pickup"}
                  </label>
                  <input
                    type="text"
                    value={newOrderTable}
                    onChange={(e) => setNewOrderTable(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                    placeholder="e.g. Table 4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={newOrderCustomer}
                    onChange={(e) => setNewOrderCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                    placeholder="Walk-in Guest"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Payment Method</label>
                  <select
                    value={newOrderPayment}
                    onChange={(e) => setNewOrderPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  >
                    <option value="UPI">UPI / QR</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              {/* Dish Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Add Dishes to Order
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-warm-200 rounded-xl bg-warm-50/50">
                  {menuCatalog.map((dish) => (
                    <button
                      type="button"
                      key={dish.id}
                      onClick={() => handleAddItemToForm(dish.id)}
                      className="p-2 text-left rounded-lg bg-white border border-warm-200 hover:border-forest-700 text-xs transition"
                    >
                      <div className="font-semibold text-stone-900 truncate">{dish.name}</div>
                      <div className="text-[11px] text-stone-500">₹{dish.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Basket */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Order Basket ({selectedItems.length} items)
                </label>
                <div className="divide-y divide-warm-100 border border-warm-200 rounded-xl overflow-hidden text-xs max-h-40 overflow-y-auto">
                  {selectedItems.map((sel) => {
                    const dish = menuCatalog.find((m) => m.id === sel.menuItemId)
                    return (
                      <div key={sel.menuItemId} className="p-2 flex items-center justify-between bg-white">
                        <span className="font-medium text-stone-800">{dish?.name}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity - 1)}
                            className="w-6 h-6 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 font-bold"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold w-4 text-center">{sel.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity + 1)}
                            className="w-6 h-6 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 font-bold"
                          >
                            +
                          </button>
                          <span className="font-bold w-14 text-right">
                            ₹{(dish?.price || 0) * sel.quantity}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-warm-100 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{formSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%):</span>
                  <span>₹{formTax}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-forest-900 pt-1 border-t border-warm-200">
                  <span>Grand Total:</span>
                  <span>₹{formGrandTotal}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedItems.length === 0}
                  className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  Confirm & Fire Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
