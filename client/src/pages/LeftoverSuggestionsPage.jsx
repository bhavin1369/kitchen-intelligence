import React, { useState } from "react"
import {
  Sparkles,
  ChefHat,
  Clock,
  Percent,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  UtensilsCrossed,
  ShieldCheck,
  Send,
  Plus
} from "lucide-react"
import { leftoverSuggestions as initialSuggestions, inventoryBatches } from "../data/mockData"

export const LeftoverSuggestionsPage = () => {
  const [recipes, setRecipes] = useState(initialSuggestions)
  const [pushedSpecial, setPushedSpecial] = useState(null)
  const [customPrompt, setCustomPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  // Near expiry batches
  const urgentBatches = inventoryBatches.filter(
    (b) => b.shelfLifeStatus === "critical" || b.shelfLifeStatus === "warning"
  )

  const handlePushSpecial = (title) => {
    setPushedSpecial(title)
    setTimeout(() => setPushedSpecial(null), 3500)
  }

  const handleGenerateCustom = (e) => {
    e.preventDefault()
    if (!customPrompt) return
    setIsGenerating(true)
    setTimeout(() => {
      const newRecipe = {
        id: recipes.length + 1,
        title: customPrompt.includes("Biryani") ? "Crispy Biryani Kebabs" : `Chef's Special ${customPrompt}`,
        targetIngredient: customPrompt,
        rescuedQuantity: "3.0 kg",
        feasibilityScore: 94,
        sellingPrice: 195,
        foodCost: 45,
        marginPercent: 77,
        prepTimeMinutes: 18,
        difficulty: "Easy",
        missingIngredients: [],
        pantryMatches: ["Ghee", "Garam Masala", "Mint Chutney"],
        chefNotes: "High-margin chef special upcycling leftover pantry items.",
      }
      setRecipes([newRecipe, ...recipes])
      setIsGenerating(false)
      setCustomPrompt("")
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              AI Recipe & Surplus Upcycling
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gold-100 text-gold-800 border border-gold-300">
              Zero-Waste Culinary AI
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Transform expiring ingredients into creative, profitable daily specials before they spoil.
          </p>
        </div>
      </div>

      {pushedSpecial && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
          <span>
            <strong>Pushed to POS:</strong> <em>"{pushedSpecial}"</em> has been added to today's Daily Specials board with priority kitchen display!
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Surplus at Risk</div>
          <div className="text-2xl font-bold text-rose-600 mt-2">₹3,420 Value</div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Across 3 near-expiry batches</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Potential Specials Revenue</div>
          <div className="text-2xl font-bold text-forest-900 mt-2">₹12,800</div>
          <p className="text-[11px] text-stone-500 mt-1">From 95 projected special portions</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Rescued Food This Month</div>
          <div className="text-2xl font-bold text-stone-900 mt-2">38.5 kg</div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">82% waste prevention rate</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Avg Specials Margin</div>
          <div className="text-2xl font-bold text-gold-700 mt-2">78.5%</div>
          <p className="text-[11px] text-stone-500 mt-1">Significantly above standard menu avg</p>
        </div>
      </div>

      {/* Expiring Batch Urgency Alert */}
      <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 text-stone-900 space-y-3">
        <div className="flex items-center space-x-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Priority Surplus Ingredients Needing Upcycling (Next 24 - 48 Hours)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {urgentBatches.map((b) => (
            <div key={b.id} className="p-3 rounded-xl bg-white border border-rose-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-900">{b.ingredientName}</span>
                <span className="font-mono text-rose-700 font-bold">{b.daysToExpiry <= 1 ? "<24h" : "<48h"}</span>
              </div>
              <div className="text-stone-500 mt-1 text-[11px]">
                Remaining: <strong>{b.quantityRemaining} {b.unit}</strong> • Value at Risk: ₹{b.financialValueAtRisk}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recipe Generator Prompt Bar */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
        <form onSubmit={handleGenerateCustom} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-gold-600 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Type any surplus ingredient (e.g. Cooked Basmati Rice, Mint Leaves, Curd)..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-warm-50 border border-warm-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-forest-800"
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating || !customPrompt}
            className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-gold-400" />
                <span>Generate Recipe Concept</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* AI Recommended Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="p-6 rounded-2xl bg-white border border-warm-200 shadow-card hover:shadow-card-hover transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest-50 text-forest-800 border border-forest-200">
                  {recipe.feasibilityScore}% Pantry Match
                </span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Rescues {recipe.rescuedQuantity} {recipe.targetIngredient}
                </span>
              </div>

              <h3 className="font-bold text-lg text-stone-900 mt-3">{recipe.title}</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{recipe.chefNotes}</p>

              {/* Ingredients match breakdown */}
              <div className="mt-4 p-3 rounded-xl bg-warm-50 border border-warm-100 text-xs space-y-1.5">
                <div className="font-semibold text-stone-700 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-forest-700" />
                  <span>In-Stock Pantry Matches:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recipe.pantryMatches.map((ing, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white border border-warm-200 text-[11px] text-stone-700"
                    >
                      {ing}
                    </span>
                  ))}
                </div>

                {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                  <div className="text-[11px] text-amber-700 mt-1">
                    Missing: {recipe.missingIngredients.join(", ")}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-warm-100">
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                <div className="p-2 rounded-lg bg-warm-50 border border-warm-100">
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">Suggested Price</div>
                  <div className="font-bold text-stone-900 mt-0.5">₹{recipe.sellingPrice}</div>
                </div>
                <div className="p-2 rounded-lg bg-warm-50 border border-warm-100">
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">Est. Food Cost</div>
                  <div className="font-bold text-stone-700 mt-0.5">₹{recipe.foodCost}</div>
                </div>
                <div className="p-2 rounded-lg bg-forest-50 border border-forest-100">
                  <div className="text-[10px] text-forest-700 uppercase font-semibold">Gross Margin</div>
                  <div className="font-bold text-forest-900 mt-0.5">{recipe.marginPercent}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Prep: {recipe.prepTimeMinutes} mins</span>
                </span>

                <button
                  onClick={() => handlePushSpecial(recipe.title)}
                  className="px-4 py-2 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-gold-400" />
                  <span>Push to Daily Specials</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
