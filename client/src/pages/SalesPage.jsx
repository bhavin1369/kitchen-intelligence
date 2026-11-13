import React, { useState, useEffect, useRef } from "react"
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
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  ChefHat,
  Trash2,
  Edit2,
  Upload,
  Download,
  RefreshCw,
  Loader2,
  FileSpreadsheet
} from "lucide-react"
import { salesService, menuService } from "../services/api"

export const SalesPage = () => {
  // Data state
  const [sales, setSales] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Aggregates from backend
  const [totalCount, setTotalCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalPortions, setTotalPortions] = useState(0)
  const [averageTicket, setAverageTicket] = useState(0)

  // Filters
  const [period, setPeriod] = useState("all") // daily, weekly, monthly, all
  const [selectedMenuItem, setSelectedMenuItem] = useState("all")
  const [selectedChannel, setSelectedChannel] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCsvModal, setShowCsvModal] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)

  // Add / Edit Order Form State
  const [formSalesDate, setFormSalesDate] = useState(new Date().toISOString().split("T")[0])
  const [formChannel, setFormChannel] = useState("Dine-in")
  const [formTable, setFormTable] = useState("Table 1")
  const [formCustomer, setFormCustomer] = useState("Walk-in Guest")
  const [formPayment, setFormPayment] = useState("UPI")
  const [formStatus, setFormStatus] = useState("completed")
  const [formNotes, setFormNotes] = useState("")
  const [formItems, setFormItems] = useState([])

  // CSV File upload state
  const [csvFile, setCsvFile] = useState(null)
  const [csvResult, setCsvResult] = useState(null)
  const fileInputRef = useRef(null)

  // 1. Fetch menu items for dropdown selectors
  useEffect(() => {
    menuService.getAll().then((res) => {
      if (res.data?.success) {
        setMenuItems(res.data.data || [])
      }
    }).catch(console.error)
  }, [])

  // 2. Fetch sales with active filters
  const fetchSales = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const params = {
        limit: 150,
      }
      if (period !== "all") params.period = period
      if (selectedMenuItem !== "all") params.menuItemId = selectedMenuItem
      if (selectedChannel !== "all") params.channel = selectedChannel
      if (selectedStatus !== "all") params.status = selectedStatus
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const res = await salesService.getAll(params)
      if (res.data?.success) {
        setSales(res.data.data || [])
        setTotalCount(res.data.total || 0)
        setTotalRevenue(res.data.totalRevenue || 0)
        setTotalPortions(res.data.totalPortions || 0)
        setAverageTicket(res.data.averageTicketSize || 0)
      } else {
        setError(res.data?.message || "Failed to load sales data.")
      }
    } catch (err) {
      console.error("Sales fetch error:", err)
      setError(err.response?.data?.message || "Failed to connect to sales service.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [period, selectedMenuItem, selectedChannel, selectedStatus, startDate, endDate])

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSales(true)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Auto-dismiss alert
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4500)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  // Open New Order Modal
  const handleOpenAddModal = () => {
    setFormSalesDate(new Date().toISOString().split("T")[0])
    setFormChannel("Dine-in")
    setFormTable("Table 1")
    setFormCustomer("Walk-in Guest")
    setFormPayment("UPI")
    setFormNotes("")
    // Default to first menu item with qty 1
    if (menuItems.length > 0) {
      setFormItems([{ menuItemId: menuItems[0].id, quantity: 1 }])
    } else {
      setFormItems([])
    }
    setShowAddModal(true)
  }

  // Add Item to Order Form
  const handleAddItemToForm = (menuItemId) => {
    setFormItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItemId)
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { menuItemId, quantity: 1 }]
    })
  }

  const handleUpdateItemQty = (menuItemId, qty) => {
    if (qty <= 0) {
      setFormItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId))
    } else {
      setFormItems((prev) =>
        prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: qty } : i))
      )
    }
  }

  // Calculate Subtotal & Totals for Add Form
  const formSubtotal = formItems.reduce((sum, item) => {
    const itemData = menuItems.find((m) => m.id === item.menuItemId)
    return sum + (itemData ? itemData.price * item.quantity : 0)
  }, 0)
  const formTax = Math.round(formSubtotal * 0.05 * 100) / 100
  const formGrandTotal = Math.round((formSubtotal + formTax) * 100) / 100

  // Submit New Daily Sale
  const handleCreateSale = async (e) => {
    e.preventDefault()
    if (formItems.length === 0) {
      setError("Please add at least one dish to the sales order.")
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      salesDate: formSalesDate,
      channel: formChannel,
      tableNumber: formChannel === "Dine-in" ? formTable : "",
      customerName: formCustomer || "Walk-in Guest",
      paymentMethod: formPayment,
      notes: formNotes,
      items: formItems.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      })),
    }

    try {
      const res = await salesService.create(payload)
      if (res.data?.success) {
        setSuccessMsg(
          `Order ${res.data.data?.orderNumber || "New Order"} added successfully! Raw ingredients deducted via FEFO.`
        )
        setShowAddModal(false)
        fetchSales(true)
      }
    } catch (err) {
      console.error("Failed to create sale:", err)
      setError(err.response?.data?.message || "Failed to record sales order.")
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Order Modal
  const handleOpenEditModal = (order) => {
    setEditingOrder(order)
    setFormSalesDate(order.date || new Date().toISOString().split("T")[0])
    setFormChannel(order.channel || "Dine-in")
    setFormTable(order.tableNumber || "")
    setFormCustomer(order.customerName || "Walk-in Guest")
    setFormPayment(order.paymentMethod || "UPI")
    setFormStatus(order.status || "completed")
    setFormNotes(order.notes || "")
    setFormItems(
      order.items?.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      })) || []
    )
    setShowEditModal(true)
  }

  // Submit Edit Sale
  const handleUpdateSale = async (e) => {
    e.preventDefault()
    if (!editingOrder) return

    setSubmitting(true)
    setError(null)

    const payload = {
      salesDate: formSalesDate,
      channel: formChannel,
      tableNumber: formChannel === "Dine-in" ? formTable : "",
      customerName: formCustomer,
      paymentMethod: formPayment,
      status: formStatus,
      notes: formNotes,
      items: formItems.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      })),
    }

    try {
      const res = await salesService.update(editingOrder.id, payload)
      if (res.data?.success) {
        setSuccessMsg(`Sale order ${editingOrder.orderNumber} updated successfully.`)
        setShowEditModal(false)
        if (selectedOrder && selectedOrder.id === editingOrder.id) {
          setSelectedOrder(res.data.data)
        }
        fetchSales(true)
      }
    } catch (err) {
      console.error("Update sale error:", err)
      setError(err.response?.data?.message || "Failed to update sale record.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Sale
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return
    setSubmitting(true)

    try {
      const res = await salesService.delete(orderToDelete.id)
      if (res.data?.success) {
        setSuccessMsg(`Sale ${orderToDelete.orderNumber} deleted successfully.`)
        setOrderToDelete(null)
        if (selectedOrder && selectedOrder.id === orderToDelete.id) {
          setSelectedOrder(null)
        }
        setSales((prev) => prev.filter((s) => s.id !== orderToDelete.id))
        fetchSales(true)
      }
    } catch (err) {
      console.error("Delete sale error:", err)
      setError(err.response?.data?.message || "Failed to delete sale order.")
    } finally {
      setSubmitting(false)
    }
  }

  // CSV Upload handler
  const handleUploadCsv = async (e) => {
    e.preventDefault()
    if (!csvFile) {
      setError("Please select a valid CSV file to upload.")
      return
    }

    setSubmitting(true)
    setError(null)
    setCsvResult(null)

    const formData = new FormData()
    formData.append("file", csvFile)

    try {
      const res = await salesService.uploadCsv(formData)
      if (res.data?.success) {
        setCsvResult(res.data.data)
        setSuccessMsg(
          `Imported ${res.data.data?.ordersImported || 0} sales orders from CSV successfully!`
        )
        fetchSales(true)
      }
    } catch (err) {
      console.error("CSV upload error:", err)
      setError(err.response?.data?.message || "CSV processing failed. Check column headers.")
    } finally {
      setSubmitting(false)
    }
  }

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "date,item_name,quantity,channel,table_number,customer_name,payment_method\n" +
      "2026-11-13,Gujarati Thali,2,Dine-in,Table 4,Bhavin Shah,UPI\n" +
      "2026-11-13,Paneer Butter Masala,1,Dine-in,Table 4,Bhavin Shah,UPI\n" +
      "2026-11-13,Dosa,3,Takeaway,,Pooja Mehta,Cash\n" +
      "2026-11-13,Tea,4,Dine-in,Table 2,Aarav Joshi,UPI\n" +
      "2026-11-12,Vegetable Pulao,2,Online,,Online Delivery,Card\n" +
      "2026-11-12,Sandwich,2,Takeaway,,Walk-in Guest,Cash\n" +
      "2026-11-12,Coffee,2,Dine-in,Table 6,Kiran Desai,UPI\n"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "sample_canteen_sales.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Sales & POS Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-forest-100 text-forest-900 border border-forest-200 uppercase tracking-wider">
              Live SQLite POS
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Real-time canteen dining & takeaway bills, CSV sales import, and automated FEFO ingredient deductions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fetchSales(true)}
            disabled={refreshing}
            className="p-2.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-forest-800" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setCsvFile(null)
              setCsvResult(null)
              setShowCsvModal(true)
            }}
            className="px-3.5 py-2.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-forest-800" />
            <span>Upload Sales CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>New POS Order</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
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
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Filtered Orders</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{totalCount}</div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {sales.filter((o) => o.status === "completed").length} Completed in current view
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Sales Turnover</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Net gross receipts (inc. GST)</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Average Ticket Size</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            ₹{averageTicket.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Per dining transaction</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Portions Served</div>
          <div className="text-2xl font-bold text-gold-700 mt-2">
            {totalPortions} dishes
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Dishes prepared & served</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card space-y-4">
        {/* Row 1: Search & Period Tabs */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Table #, or Dish name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-forest-800"
            />
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center space-x-1 bg-warm-100/70 p-1 rounded-xl text-xs">
            <span className="text-stone-500 font-semibold px-2 text-[11px]">Period:</span>
            {[
              { id: "all", label: "All History" },
              { id: "daily", label: "Today (Daily)" },
              { id: "weekly", label: "Past 7 Days (Weekly)" },
              { id: "monthly", label: "Past 30 Days (Monthly)" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriod(p.id)
                  setStartDate("")
                  setEndDate("")
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  period === p.id
                    ? "bg-forest-900 text-gold-400 font-semibold shadow-xs"
                    : "text-stone-700 hover:text-stone-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-warm-100">
          {/* Menu Item Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">
              Filter by Dish:
            </label>
            <select
              value={selectedMenuItem}
              onChange={(e) => setSelectedMenuItem(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-stone-800"
            >
              <option value="all">All Menu Dishes</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">
              Sales Channel:
            </label>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-stone-800"
            >
              <option value="all">All Channels</option>
              <option value="Dine-in">Dine-in</option>
              <option value="Takeaway">Takeaway</option>
              <option value="Online">Online Delivery</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">
              From Date:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPeriod("all")
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-stone-800"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">
              To Date:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPeriod("all")
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-warm-50 border border-warm-200 text-stone-800"
            />
          </div>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="rounded-2xl bg-white border border-warm-200 shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-forest-800 animate-spin" />
            <p className="text-sm text-stone-500">Loading sales records from SQLite...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-warm-100/70 border-b border-warm-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Channel & Table</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100 text-stone-800">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-stone-400">
                      No sales records found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  sales.map((ord) => (
                    <tr key={ord.id} className="hover:bg-warm-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-forest-900">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                        <div>{ord.date}</div>
                        <div className="text-stone-400">{ord.time}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-900">{ord.channel}</span>
                        {ord.tableNumber && (
                          <span className="ml-1.5 text-stone-500 text-[11px]">({ord.tableNumber})</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-700">{ord.customerName}</td>
                      <td className="py-3 px-4 max-w-xs truncate text-stone-600">
                        {ord.items && ord.items.length > 0
                          ? ord.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
                          : "No dishes"}
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
                        ₹{(ord.totalAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            ord.status === "completed"
                              ? "bg-forest-100 text-forest-800 border border-forest-200"
                              : ord.status === "in-kitchen"
                              ? "bg-gold-100 text-gold-800 border border-gold-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2 py-1 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 text-[11px] font-semibold transition inline-flex items-center space-x-1"
                          title="Inspect Order Bill"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(ord)}
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-warm-100 transition"
                          title="Edit Sale"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setOrderToDelete(ord)}
                          className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
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
                  {selectedOrder.date} • {selectedOrder.time} • {selectedOrder.channel}{" "}
                  {selectedOrder.tableNumber ? `(${selectedOrder.tableNumber})` : ""}
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
                  <span className="font-bold text-forest-800 capitalize">{selectedOrder.status}</span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex justify-between pt-1 border-t border-warm-200">
                    <span className="text-stone-500">Notes:</span>
                    <span className="text-stone-800 italic">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Ordered Dishes
                </h4>
                <div className="divide-y divide-warm-100 border border-warm-200 rounded-xl overflow-hidden text-xs">
                  {selectedOrder.items?.map((it, idx) => (
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
                  Ingredients deduced according to Bill of Materials from the oldest active batches in SQLite.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-warm-200 flex justify-between">
              <button
                onClick={() => {
                  setSelectedOrder(null)
                  handleOpenEditModal(selectedOrder)
                }}
                className="px-3 py-1.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold flex items-center space-x-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit This Order</span>
              </button>

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

      {/* New POS Order / Daily Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Add Daily Sale / POS Order</h3>
                <p className="text-xs text-stone-500">
                  Record canteen dining or takeaway bill with automatic FEFO stock decrement
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">
                    Sales Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formSalesDate}
                    onChange={(e) => setFormSalesDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Channel</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  >
                    <option value="Dine-in">Dine-in</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Online">Online Delivery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">
                    {formChannel === "Dine-in" ? "Table Number" : "Token / Pickup"}
                  </label>
                  <input
                    type="text"
                    value={formTable}
                    onChange={(e) => setFormTable(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                    placeholder="e.g. Table 4"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                    placeholder="Walk-in Guest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Payment Method</label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  >
                    <option value="UPI">UPI / QR</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Notes / Instructions</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                    placeholder="Less spicy, extra pickle..."
                  />
                </div>
              </div>

              {/* Dish Selection Grid */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Select Canteen Dishes to Add
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 border border-warm-200 rounded-xl bg-warm-50/50">
                  {menuItems.map((dish) => (
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
                  Order Basket ({formItems.length} items)
                </label>
                <div className="divide-y divide-warm-100 border border-warm-200 rounded-xl overflow-hidden text-xs max-h-40 overflow-y-auto">
                  {formItems.length === 0 ? (
                    <div className="p-4 text-center text-stone-400">
                      No dishes added to this order yet. Click a dish above.
                    </div>
                  ) : (
                    formItems.map((sel) => {
                      const dish = menuItems.find((m) => m.id === sel.menuItemId)
                      return (
                        <div key={sel.menuItemId} className="p-2.5 flex items-center justify-between bg-white">
                          <span className="font-medium text-stone-800">{dish?.name || "Dish"}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity - 1)}
                              className="w-6 h-6 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold w-5 text-center">{sel.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity + 1)}
                              className="w-6 h-6 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 font-bold"
                            >
                              +
                            </button>
                            <span className="font-bold w-16 text-right">
                              ₹{((dish?.price || 0) * sel.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-warm-100 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{formSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5%):</span>
                  <span>₹{formTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-forest-900 pt-1 border-t border-warm-200">
                  <span>Grand Total:</span>
                  <span>₹{formGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formItems.length === 0}
                  className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow transition disabled:opacity-50 flex items-center space-x-1"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm & Save Sale</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">
                  Edit Sale Order — {editingOrder.orderNumber}
                </h3>
                <p className="text-xs text-stone-500">Modify customer, date, status, or dishes</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSale} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Sales Date</label>
                  <input
                    type="date"
                    required
                    value={formSalesDate}
                    onChange={(e) => setFormSalesDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  >
                    <option value="completed">Completed</option>
                    <option value="in-kitchen">In-Kitchen</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Channel</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  >
                    <option value="Dine-in">Dine-in</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Online">Online Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Table / Token</label>
                  <input
                    type="text"
                    value={formTable}
                    onChange={(e) => setFormTable(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Customer</label>
                  <input
                    type="text"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Payment Method</label>
                  <select
                    value={formPayment}
                    onChange={(e) => setFormPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  >
                    <option value="UPI">UPI / QR</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              {/* Order Basket */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Edit Dishes
                </label>
                <div className="divide-y divide-warm-100 border border-warm-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {formItems.map((sel) => {
                    const dish = menuItems.find((m) => m.id === sel.menuItemId)
                    return (
                      <div key={sel.menuItemId} className="p-2 flex items-center justify-between bg-white">
                        <span className="font-medium text-stone-800">{dish?.name || "Dish"}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity - 1)}
                            className="w-6 h-6 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 font-bold"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold w-5 text-center">{sel.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(sel.menuItemId, sel.quantity + 1)}
                            className="w-6 h-6 rounded bg-warm-100 hover:bg-warm-200 text-stone-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-forest-900 text-white font-semibold shadow hover:bg-forest-950 flex items-center space-x-1"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-forest-800" />
                <h3 className="font-bold text-lg text-forest-900">Upload Sales CSV</h3>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadCsv} className="mt-4 space-y-4 text-xs">
              <p className="text-stone-600">
                Bulk import sales history directly into SQLite. The system validates dates, dish names against
                the canteen catalog, and processes recipe stock deductions.
              </p>

              {/* Download Sample */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-warm-50 border border-warm-200">
                <div>
                  <div className="font-semibold text-stone-800">Need a valid template?</div>
                  <div className="text-[11px] text-stone-500">Columns: date, item_name, quantity, channel, payment_method</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-3 py-1.5 rounded-lg bg-forest-100 hover:bg-forest-200 text-forest-900 font-semibold flex items-center space-x-1 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample</span>
                </button>
              </div>

              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-warm-300 rounded-xl p-6 text-center hover:border-forest-800 cursor-pointer transition bg-warm-50/50"
              >
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                {csvFile ? (
                  <div>
                    <span className="font-bold text-forest-900">{csvFile.name}</span>
                    <span className="text-stone-500 block text-[11px]">
                      {(csvFile.size / 1024).toFixed(1)} KB — Ready to import
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-stone-800">Click to select CSV file</span>
                    <span className="text-stone-400 block text-[11px] mt-0.5">Supports UTF-8 .csv files</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setCsvFile(e.target.files[0] || null)}
                />
              </div>

              {/* Result Summary */}
              {csvResult && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Import Completed Successfully!</span>
                  </div>
                  <div className="text-[11px]">
                    Orders Imported: <strong>{csvResult.ordersImported}</strong> | Total Sales Value:{" "}
                    <strong>₹{csvResult.totalSalesAmount}</strong>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting || !csvFile}
                  className="px-4 py-2 rounded-lg bg-forest-900 text-white font-semibold shadow hover:bg-forest-950 disabled:opacity-50 flex items-center space-x-1"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Upload & Import</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <h3 className="font-bold text-base text-rose-900">Delete Sale Order</h3>
            <p className="text-xs text-stone-600 mt-2">
              Are you sure you want to delete order{" "}
              <strong className="text-stone-900 font-mono">"{orderToDelete.orderNumber}"</strong>?
              This record will be permanently deleted from the SQLite database.
            </p>

            <div className="flex justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center space-x-1"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
