import React, { useState } from "react"
import {
  UtensilsCrossed,
  Search,
  Plus,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  X,
  Edit2
} from "lucide-react"
import { menuCatalog as initialMenu } from "../data/mockData"
import { Link } from "react-router-dom"

export const MenuPage = () => {
  const [menuItems, setMenuItems] = useState(initialMenu)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dietFilter, setDietFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)

  // New item form
  const [newItemName, setNewItemName] = useState("")
  const [newItemCategory, setNewItemCategory] = useState("Mains")
  const [newItemPrice, setNewItemPrice] = useState(280)
  const [newItemCost, setNewItemCost] = useState(95)
  const [newItemPrepTime, setNewItemPrepTime] = useState(20)
  const [newItemIsVeg, setNewItemIsVeg] = useState(true)
  const [newItemDesc, setNewItemDesc] = useState("")

  const categories = ["all", "Starters", "Mains", "Biryani", "Breads", "Desserts", "Beverages"]

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesDiet =
      dietFilter === "all" ||
      (dietFilter === "veg" && item.isVeg) ||
      (dietFilter === "nonveg" && !item.isVeg)
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesDiet && matchesSearch
  })

  // Toggle availability
  const handleToggleStatus = (id) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item))
    )
  }

  // Add Item
  const handleAddItem = (e) => {
    e.preventDefault()
    const margin = Math.round(((newItemPrice - newItemCost) / newItemPrice) * 100)
    const newItem = {
      id: menuItems.length + 1,
      name: newItemName,
      category: newItemCategory,
      price: Number(newItemPrice),
      costPrice: Number(newItemCost),
      marginPercent: margin,
      prepTimeMinutes: Number(newItemPrepTime),
      isVeg: newItemIsVeg,
      status: "active",
      popularityRank: menuItems.length + 1,
      description: newItemDesc || "Freshly curated kitchen recipe",
    }
    setMenuItems([...menuItems, newItem])
    setShowAddModal(false)
    setNewItemName("")
    setNewItemDesc("")
  }

  // Metrics
  const totalItems = menuItems.length
  const activeItems = menuItems.filter((m) => m.status === "active").length
  const avgMargin = Math.round(
    menuItems.reduce((acc, m) => acc + m.marginPercent, 0) / (totalItems || 1)
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Menu Management
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Configure sales catalog, selling prices, prep times, and live POS availability.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/recipes"
            className="px-3.5 py-2.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition"
          >
            Inspect Recipe BOMs →
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Menu Items</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">{totalItems}</div>
          <p className="text-[11px] text-stone-500 mt-1">Across 6 culinary categories</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Live in POS</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">{activeItems}</div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Ready for ordering</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Avg Gross Margin</div>
          <div className="text-2xl font-bold text-gold-700 mt-2">{avgMargin}%</div>
          <p className="text-[11px] text-stone-500 mt-1">Food cost avg: {100 - avgMargin}%</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Dietary Split</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">
            {menuItems.filter((i) => i.isVeg).length}V / {menuItems.filter((i) => !i.isVeg).length}NV
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Balanced vegetarian ratio</p>
        </div>
      </div>

      {/* Search & Category Tabs */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search dishes or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-forest-800"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-stone-500 font-semibold">Diet:</span>
            <button
              onClick={() => setDietFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                dietFilter === "all" ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700 hover:bg-warm-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDietFilter("veg")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                dietFilter === "veg" ? "bg-forest-700 text-white" : "bg-warm-100 text-stone-700 hover:bg-warm-200"
              }`}
            >
              Pure Veg
            </button>
            <button
              onClick={() => setDietFilter("nonveg")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                dietFilter === "nonveg" ? "bg-amber-700 text-white" : "bg-warm-100 text-stone-700 hover:bg-warm-200"
              }`}
            >
              Non-Veg
            </button>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap font-medium transition ${
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

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-2xl bg-white border transition shadow-card hover:shadow-card-hover flex flex-col justify-between ${
              item.status === "active" ? "border-warm-200" : "border-stone-200 opacity-60 bg-stone-50"
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${
                      item.isVeg ? "border-green-600" : "border-red-600"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.isVeg ? "bg-green-600" : "bg-red-600"
                      }`}
                    />
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                    {item.category}
                  </span>
                </div>

                {/* Status Toggle */}
                <button
                  onClick={() => handleToggleStatus(item.id)}
                  title="Toggle POS Availability"
                  className="cursor-pointer"
                >
                  {item.status === "active" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest-100 text-forest-800 border border-forest-200">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-600">
                      Inactive
                    </span>
                  )}
                </button>
              </div>

              <h3 className="font-bold text-base text-stone-900 mt-2">{item.name}</h3>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2">{item.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-warm-100">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-warm-50 border border-warm-100">
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">Selling Price</div>
                  <div className="font-bold text-stone-900 mt-0.5">₹{item.price}</div>
                </div>
                <div className="p-2 rounded-lg bg-warm-50 border border-warm-100">
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">Food Cost</div>
                  <div className="font-bold text-stone-700 mt-0.5">₹{item.costPrice}</div>
                </div>
                <div className="p-2 rounded-lg bg-forest-50 border border-forest-100">
                  <div className="text-[10px] text-forest-700 uppercase font-semibold">Margin</div>
                  <div className="font-bold text-forest-900 mt-0.5">{item.marginPercent}%</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Prep: {item.prepTimeMinutes} mins</span>
                </div>
                <Link
                  to="/recipes"
                  className="font-semibold text-forest-900 hover:text-forest-700"
                >
                  View Recipe BOM →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Menu Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Add New Menu Item</h3>
                <p className="text-xs text-stone-500">Create a dish for POS and recipe explosion</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Malai Kofta Curry"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Mains">Mains</option>
                    <option value="Biryani">Biryani</option>
                    <option value="Breads">Breads</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Dietary Type</label>
                  <select
                    value={newItemIsVeg ? "veg" : "nonveg"}
                    onChange={(e) => setNewItemIsVeg(e.target.value === "veg")}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  >
                    <option value="veg">Pure Vegetarian (Green)</option>
                    <option value="nonveg">Non-Vegetarian (Red)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItemPrepTime}
                    onChange={(e) => setNewItemPrepTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Rich aromatic gravy made with cashew paste, cardamom..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow transition"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

