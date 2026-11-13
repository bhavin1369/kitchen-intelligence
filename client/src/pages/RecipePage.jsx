import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ChefHat,
  UtensilsCrossed,
  Layers,
  Calculator,
  Search,
  Plus,
  Scale,
  Percent,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Info,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2
} from "lucide-react"
import { menuService, recipeService, inventoryService } from "../services/api"

export const RecipePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialDishParam = searchParams.get("dishId")

  // State
  const [dishes, setDishes] = useState([])
  const [selectedDishId, setSelectedDishId] = useState(null)
  const [selectedDishData, setSelectedDishData] = useState(null)
  const [dishIngredients, setDishIngredients] = useState([])
  const [availableIngredients, setAvailableIngredients] = useState([])

  const [loadingDishes, setLoadingDishes] = useState(true)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Interactive controls
  const [batchScale, setBatchScale] = useState(50) // Scale portions
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRecipeItem, setEditingRecipeItem] = useState(null)
  const [recipeToDelete, setRecipeToDelete] = useState(null)

  // Add/Edit Form State
  const [formIngredientId, setFormIngredientId] = useState("")
  const [formQuantity, setFormQuantity] = useState("0.10")
  const [formUnit, setFormUnit] = useState("kg")
  const [formPrepLoss, setFormPrepLoss] = useState("0")

  // 1. Fetch all menu dishes and all raw ingredients on mount
  useEffect(() => {
    const initData = async () => {
      setLoadingDishes(true)
      setError(null)
      try {
        const [menuRes, ingRes] = await Promise.all([
          menuService.getAll(),
          inventoryService.getIngredients()
        ])

        const menuList = menuRes.data?.data || []
        setDishes(menuList)
        setAvailableIngredients(ingRes.data?.data || [])

        if (menuList.length > 0) {
          // Select dish from query parameter if valid, else first dish
          const targetId = initialDishParam ? parseInt(initialDishParam, 10) : menuList[0].id
          const matched = menuList.find((d) => d.id === targetId) || menuList[0]
          setSelectedDishId(matched.id)
        }
      } catch (err) {
        console.error("Failed to fetch initial recipe data:", err)
        setError("Could not load dishes or ingredients from the backend.")
      } finally {
        setLoadingDishes(false)
      }
    }

    initData()
  }, [])

  // 2. Fetch recipe BOM whenever selectedDishId changes
  const fetchRecipeForDish = async (dishId) => {
    if (!dishId) return
    setLoadingRecipe(true)
    setError(null)
    try {
      const res = await recipeService.getByDish(dishId)
      if (res.data?.success) {
        setSelectedDishData(res.data.dish)
        setDishIngredients(res.data.ingredients || [])
      } else {
        setError(res.data?.message || "Failed to load recipe.")
      }
    } catch (err) {
      console.error("Failed to fetch dish recipe:", err)
      setError(err.response?.data?.message || "Failed to load recipe details.")
    } finally {
      setLoadingRecipe(false)
    }
  }

  useEffect(() => {
    if (selectedDishId) {
      fetchRecipeForDish(selectedDishId)
      setSearchParams({ dishId: selectedDishId })
    }
  }, [selectedDishId])

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(t)
    }
  }, [successMsg])

  // Filtered dishes for sidebar
  const filteredDishes = dishes.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Current active dish details (prefer live data from recipe endpoint, fallback to list item)
  const activeDish =
    selectedDishData || dishes.find((d) => d.id === selectedDishId) || { name: "Loading...", price: 0, costPrice: 0, marginPercent: 0 }

  // BOM Calculated Portion Cost & Gross Margin
  const portionFoodCost = dishIngredients.reduce((sum, item) => sum + (item.costContribution || 0), 0)
  const sellingPrice = activeDish.price || 1
  const marginPercent = Math.round(((sellingPrice - portionFoodCost) / sellingPrice) * 100)
  const avgPrepLoss = dishIngredients.length
    ? Math.round(dishIngredients.reduce((sum, item) => sum + (item.prepLossPercent || 0), 0) / dishIngredients.length)
    : 0

  // Open Add Ingredient Modal
  const handleOpenAddModal = () => {
    setEditingRecipeItem(null)
    const firstIng = availableIngredients[0]
    setFormIngredientId(firstIng ? String(firstIng.id) : "")
    setFormQuantity("0.10")
    setFormUnit(firstIng ? firstIng.unit : "kg")
    setFormPrepLoss("2.0")
    setShowAddModal(true)
  }

  // Open Edit Ingredient Modal
  const handleOpenEditModal = (item) => {
    setEditingRecipeItem(item)
    setFormIngredientId(String(item.ingredientId))
    setFormQuantity(String(item.quantityPerPortion))
    setFormUnit(item.unit)
    setFormPrepLoss(String(item.prepLossPercent || 0))
    setShowAddModal(true)
  }

  // Handle ingredient selection in form -> update default unit
  const handleSelectIngredient = (ingId) => {
    setFormIngredientId(ingId)
    const matched = availableIngredients.find((i) => String(i.id) === String(ingId))
    if (matched) {
      setFormUnit(matched.unit)
    }
  }

  // Submit Add or Edit Ingredient
  const handleSaveRecipeIngredient = async (e) => {
    e.preventDefault()
    if (!formIngredientId) {
      setError("Please select an ingredient.")
      return
    }

    const qty = parseFloat(formQuantity)
    if (isNaN(qty) || qty <= 0) {
      setError("Portion quantity must be greater than zero.")
      return
    }

    setSubmitting(true)
    setError(null)

    const payload = {
      menuItemId: selectedDishId,
      ingredientId: parseInt(formIngredientId, 10),
      quantity: qty,
      unit: formUnit,
      prepLossPercentage: parseFloat(formPrepLoss) || 0,
    }

    try {
      if (editingRecipeItem) {
        // Update existing recipe entry
        await recipeService.updateIngredient(editingRecipeItem.id, {
          quantity: payload.quantity,
          unit: payload.unit,
          prepLossPercentage: payload.prepLossPercentage,
        })
        setSuccessMsg("Recipe portion quantity updated.")
      } else {
        // Add new ingredient
        await recipeService.addIngredient(payload)
        setSuccessMsg("Ingredient added to recipe formula.")
      }
      setShowAddModal(false)
      // Refresh current dish recipe and menu list
      fetchRecipeForDish(selectedDishId)
      menuService.getAll().then((res) => setDishes(res.data?.data || []))
    } catch (err) {
      console.error("Failed to save recipe ingredient:", err)
      setError(err.response?.data?.message || "Failed to save ingredient to recipe.")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Ingredient from Recipe
  const handleConfirmDelete = async () => {
    if (!recipeToDelete) return
    setSubmitting(true)

    try {
      await recipeService.removeIngredient(recipeToDelete.id)
      setSuccessMsg(`"${recipeToDelete.ingredientName}" removed from recipe.`)
      setRecipeToDelete(null)
      fetchRecipeForDish(selectedDishId)
      menuService.getAll().then((res) => setDishes(res.data?.data || []))
    } catch (err) {
      console.error("Failed to delete recipe entry:", err)
      setError(err.response?.data?.message || "Failed to remove ingredient.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              Recipe & Bill of Materials (BOM)
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-forest-100 text-forest-900 border border-forest-200 uppercase tracking-wider">
              Live SQLite BOM
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Engineered recipe formulas, exact portioning, shrinkage loss, and bulk prep scaling for canteen dishes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchRecipeForDish(selectedDishId)}
            disabled={loadingRecipe}
            className="p-2.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-stone-700 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
            title="Refresh BOM from Database"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRecipe ? "animate-spin text-forest-800" : ""}`} />
            <span className="hidden sm:inline">Refresh BOM</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Add Ingredient to Recipe</span>
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dish Selector (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Select Canteen Dish ({dishes.length})
            </h2>
            <span className="text-[11px] text-stone-400 font-medium">BOM Explorer</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search canteen dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 focus:outline-none focus:border-forest-800"
            />
          </div>

          {loadingDishes ? (
            <div className="py-10 text-center flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-forest-800 animate-spin" />
              <span className="text-xs text-stone-500">Loading dishes...</span>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredDishes.map((dish) => {
                const isSelected = dish.id === selectedDishId
                return (
                  <button
                    key={dish.id}
                    onClick={() => setSelectedDishId(dish.id)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? "bg-forest-900 text-white border-forest-900 shadow-sm"
                        : "bg-warm-50/70 hover:bg-warm-100 text-stone-800 border-warm-200"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold truncate">{dish.name}</div>
                      <div className={`text-[11px] ${isSelected ? "text-gold-300" : "text-stone-500"}`}>
                        {dish.category} • Cost: ₹{dish.costPrice || 0}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold ${isSelected ? "text-white" : "text-stone-900"}`}>
                        ₹{dish.price}
                      </div>
                      <div className={`text-[10px] ${isSelected ? "text-stone-300" : "text-emerald-700 font-semibold"}`}>
                        {dish.marginPercent || 0}% margin
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Recipe Details & BOM Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Dish Overview Card */}
          <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-warm-100">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold-50 text-gold-800 border border-gold-200">
                  {activeDish.category || "Canteen"}
                </span>
                <h2 className="text-xl font-bold text-stone-900 mt-1">{activeDish.name}</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {activeDish.description || "Standard culinary formula with portion-based ingredient scaling."}
                </p>
              </div>

              <div className="text-right bg-warm-50 p-3 rounded-xl border border-warm-200 shrink-0">
                <div className="text-[10px] uppercase font-bold text-stone-400">Target Selling Price</div>
                <div className="text-2xl font-black text-forest-900">₹{activeDish.price}</div>
              </div>
            </div>

            {/* Financial & Prep Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-warm-50 border border-warm-100">
                <span className="text-[10px] text-stone-500 font-semibold uppercase">Portion Food Cost</span>
                <div className="text-base font-bold text-stone-900 mt-1">₹{portionFoodCost.toFixed(2)}</div>
                <span className="text-[10px] text-stone-500">From verified BOM</span>
              </div>

              <div className="p-3 rounded-xl bg-forest-50 border border-forest-100">
                <span className="text-[10px] text-forest-800 font-semibold uppercase">Gross Margin</span>
                <div className="text-base font-bold text-forest-900 mt-1">{marginPercent}%</div>
                <span className="text-[10px] text-forest-700">Healthy profit band</span>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-100">
                <span className="text-[10px] text-stone-500 font-semibold uppercase">Prep Time</span>
                <div className="text-base font-bold text-stone-900 mt-1">
                  {activeDish.prepTimeMinutes || 15} mins
                </div>
                <span className="text-[10px] text-stone-500">Station cook time</span>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-100">
                <span className="text-[10px] text-stone-500 font-semibold uppercase">Avg Prep Loss</span>
                <div className="text-base font-bold text-amber-700 mt-1">
                  {avgPrepLoss}%
                </div>
                <span className="text-[10px] text-stone-500">Trimming & shrinkage</span>
              </div>
            </div>
          </div>

          {/* Interactive Batch Prep Simulation Scaler */}
          <div className="p-5 rounded-2xl bg-forest-950 text-stone-200 border border-forest-900 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 text-gold-400 text-xs font-bold uppercase tracking-wider">
                  <Calculator className="w-4 h-4" />
                  <span>Interactive Batch Prep Scaler</span>
                </div>
                <p className="text-xs text-stone-300 mt-0.5">
                  Simulate raw ingredient requirements for lunch rush, canteen batch prep, or catering
                </p>
              </div>

              {/* Portion buttons */}
              <div className="flex items-center space-x-1.5 bg-forest-900 p-1 rounded-xl border border-forest-800">
                {[10, 25, 50, 100, 200].map((num) => (
                  <button
                    key={num}
                    onClick={() => setBatchScale(num)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      batchScale === num
                        ? "bg-gold-500 text-stone-950 shadow-sm"
                        : "text-stone-300 hover:text-white"
                    }`}
                  >
                    {num} pk
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 text-xs text-stone-400">
              Scaling BOM calculation for: <strong className="text-white">{batchScale} portions</strong> of{" "}
              <strong className="text-gold-300">{activeDish.name}</strong>
            </div>
          </div>

          {/* Ingredients Table */}
          <div className="rounded-2xl bg-white border border-warm-200 shadow-card overflow-hidden">
            <div className="p-4 border-b border-warm-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Bill of Materials Breakdown ({dishIngredients.length} Ingredients)
                </h3>
                <p className="text-xs text-stone-500">
                  Portion formula, shrinkage loss, and live stock sufficiency check
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-3 py-1.5 rounded-lg bg-forest-50 hover:bg-forest-100 text-forest-900 text-xs font-semibold border border-forest-200 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {loadingRecipe ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-forest-800 animate-spin" />
                <span className="text-xs text-stone-500">Loading recipe formula...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-warm-100/70 border-b border-warm-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                      <th className="py-3 px-4">Ingredient</th>
                      <th className="py-3 px-4">Qty / Portion</th>
                      <th className="py-3 px-4">Shrinkage</th>
                      <th className="py-3 px-4">Portion Cost</th>
                      <th className="py-3 px-4 font-bold text-forest-900">Scaled ({batchScale} pk)</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100 text-stone-800">
                    {dishIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-stone-400">
                          No ingredients linked to this dish recipe yet. Click "Add Ingredient" to build the BOM.
                        </td>
                      </tr>
                    ) : (
                      dishIngredients.map((ing) => {
                        const lossFactor = 1.0 + ((ing.prepLossPercent || 0) / 100.0)
                        const scaledQty = (ing.quantityPerPortion * batchScale * lossFactor).toFixed(2)
                        const currentStock = ing.currentStock || 0
                        const hasShortage = currentStock < parseFloat(scaledQty)

                        return (
                          <tr key={ing.id} className="hover:bg-warm-50/70 transition">
                            <td className="py-3 px-4 font-semibold text-stone-900">
                              {ing.ingredientName}
                              {ing.category && (
                                <span className="block text-[10px] text-stone-400 font-normal">
                                  {ing.category}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {ing.quantityPerPortion} {ing.unit}
                            </td>
                            <td className="py-3 px-4 text-stone-500">
                              {ing.prepLossPercent || 0}% loss
                            </td>
                            <td className="py-3 px-4 font-bold text-stone-900">
                              ₹{(ing.costContribution || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-forest-900">
                              {scaledQty} {ing.unit}
                            </td>
                            <td className="py-3 px-4">
                              {hasShortage ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Shortage ({currentStock} avail)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-forest-100 text-forest-800 border border-forest-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Sufficient ({currentStock} {ing.unit})</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1">
                              <button
                                onClick={() => handleOpenEditModal(ing)}
                                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-warm-100"
                                title="Edit Quantity or Shrinkage"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRecipeToDelete(ing)}
                                className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Remove Ingredient"
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
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Recipe Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">
                  {editingRecipeItem ? `Edit Portion: ${editingRecipeItem.ingredientName}` : `Add Ingredient to ${activeDish.name}`}
                </h3>
                <p className="text-xs text-stone-500">
                  Link raw inventory item with precise single-serving portioning
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipeIngredient} className="mt-4 space-y-4 text-xs">
              {!editingRecipeItem && (
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">
                    Select Ingredient <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formIngredientId}
                    onChange={(e) => handleSelectIngredient(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  >
                    <option value="" disabled>
                      -- Choose an ingredient --
                    </option>
                    {availableIngredients.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit}) — Stock: {inv.currentStock} {inv.unit} (₹{inv.unitCost}/{inv.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">
                    Portion Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="l">l (Liter)</option>
                    <option value="ml">ml (Milliliter)</option>
                    <option value="pcs">pcs (Pieces)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">
                  Prep Loss / Shrinkage (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={formPrepLoss}
                  onChange={(e) => setFormPrepLoss(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Trimming loss, boiling evaporation, or kitchen prep shrinkage.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  <span>{editingRecipeItem ? "Update Portion" : "Add to Recipe"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recipeToDelete && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <h3 className="font-bold text-base text-rose-900">Remove Recipe Ingredient</h3>
            <p className="text-xs text-stone-600 mt-2">
              Are you sure you want to remove <strong className="text-stone-900">"{recipeToDelete.ingredientName}"</strong> from the BOM formula of <strong className="text-stone-900">{activeDish.name}</strong>?
            </p>

            <div className="flex justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
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
                <span>Remove Ingredient</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
