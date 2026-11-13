import React, { useState } from "react"
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
  X,
  ArrowRight,
  Info
} from "lucide-react"
import { recipesList as initialRecipes, menuCatalog, inventoryItems } from "../data/mockData"

export const RecipePage = () => {
  const [selectedDishId, setSelectedDishId] = useState(1) // Default to Hyderabadi Biryani
  const [batchScale, setBatchScale] = useState(50) // Simulate 50 portions
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false)

  // Current selected dish details
  const activeDish = menuCatalog.find((m) => m.id === selectedDishId) || menuCatalog[0]
  const dishIngredients = initialRecipes.filter((r) => r.menuItemId === activeDish.id)

  // Calculate portion cost from BOM
  const portionFoodCost = dishIngredients.reduce((sum, item) => sum + item.costContribution, 0)
  const marginPercent = Math.round(((activeDish.price - portionFoodCost) / activeDish.price) * 100)

  // Filtered dishes for sidebar selector
  const filteredDishes = menuCatalog.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
            Recipe & Bill of Materials (BOM)
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Engineered recipe formulas, exact ingredient portioning, shrinkage loss, and bulk prep scaling.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddIngredientModal(true)}
            className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Add Ingredient to Recipe</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dish Selector (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Select Recipe ({menuCatalog.length} Dishes)
            </h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search recipe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 focus:outline-none focus:border-forest-800"
            />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredDishes.map((dish) => {
              const isSelected = dish.id === selectedDishId
              const bomCount = initialRecipes.filter((r) => r.menuItemId === dish.id).length
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
                      {dish.category} • {bomCount} Ingredients
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold ${isSelected ? "text-white" : "text-stone-900"}`}>
                      ₹{dish.price}
                    </div>
                    <div className={`text-[10px] ${isSelected ? "text-stone-300" : "text-emerald-700 font-semibold"}`}>
                      {dish.marginPercent}% margin
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Recipe Details & BOM Inspector (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Dish Overview Card */}
          <div className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-warm-100">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold-50 text-gold-800 border border-gold-200">
                  {activeDish.category}
                </span>
                <h2 className="text-xl font-bold text-stone-900 mt-1">{activeDish.name}</h2>
                <p className="text-xs text-stone-500 mt-0.5">{activeDish.description}</p>
              </div>

              <div className="text-right bg-warm-50 p-3 rounded-xl border border-warm-200">
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
                  {activeDish.prepTimeMinutes} mins
                </div>
                <span className="text-[10px] text-stone-500">Cook station time</span>
              </div>

              <div className="p-3 rounded-xl bg-warm-50 border border-warm-100">
                <span className="text-[10px] text-stone-500 font-semibold uppercase">Est. Prep Loss</span>
                <div className="text-base font-bold text-amber-700 mt-1">
                  {dishIngredients[0]?.prepLossPercent || 8}%
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
                  Simulate raw ingredient requirements for catering or anticipated service shifts
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
              <h3 className="font-bold text-stone-900 text-sm">
                Bill of Materials Breakdown ({dishIngredients.length} Ingredients)
              </h3>
              <span className="text-xs text-stone-500">Unit cost benchmark: current market price</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-warm-100/70 border-b border-warm-200 text-stone-600 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="py-3 px-4">Ingredient</th>
                    <th className="py-3 px-4">Qty / Portion</th>
                    <th className="py-3 px-4">Shrinkage Loss</th>
                    <th className="py-3 px-4">Portion Cost</th>
                    <th className="py-3 px-4 font-bold text-forest-900">Scaled ({batchScale} pk)</th>
                    <th className="py-3 px-4 text-right">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100 text-stone-800">
                  {dishIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400">
                        No recipe ingredients linked to this dish yet.
                      </td>
                    </tr>
                  ) : (
                    dishIngredients.map((ing) => {
                      const scaledQty = (ing.quantityPerPortion * batchScale).toFixed(2)
                      const invItem = inventoryItems.find((i) => i.name.toLowerCase() === ing.ingredientName.toLowerCase())
                      const currentStock = invItem ? invItem.currentStock : 25
                      const hasShortage = currentStock < scaledQty

                      return (
                        <tr key={ing.id} className="hover:bg-warm-50/70 transition">
                          <td className="py-3 px-4 font-semibold text-stone-900">
                            {ing.ingredientName}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {ing.quantityPerPortion} {ing.unit}
                          </td>
                          <td className="py-3 px-4 text-stone-500">
                            {ing.prepLossPercent}% loss
                          </td>
                          <td className="py-3 px-4 font-bold text-stone-900">
                            ₹{ing.costContribution.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-forest-900">
                            {scaledQty} {ing.unit}
                          </td>
                          <td className="py-3 px-4 text-right">
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
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Ingredient Modal */}
      {showAddIngredientModal && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-warm-200 shadow-2xl p-6 text-stone-800 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-warm-200">
              <div>
                <h3 className="font-bold text-lg text-forest-900">Add Ingredient to {activeDish.name}</h3>
                <p className="text-xs text-stone-500">Link raw inventory item with portion quantity</p>
              </div>
              <button
                onClick={() => setShowAddIngredientModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                setShowAddIngredientModal(false)
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Select Ingredient</label>
                <select className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200">
                  {inventoryItems.map((inv) => (
                    <option key={inv.id} value={inv.name}>
                      {inv.name} ({inv.unit}) — Current Stock: {inv.currentStock} {inv.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Portion Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue="0.25"
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Prep Loss %</label>
                  <input
                    type="number"
                    defaultValue="5"
                    className="w-full px-3 py-2 rounded-lg bg-warm-50 border border-warm-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddIngredientModal(false)}
                  className="px-4 py-2 rounded-lg bg-stone-200 text-stone-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-forest-900 text-white font-semibold shadow"
                >
                  Add to Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
