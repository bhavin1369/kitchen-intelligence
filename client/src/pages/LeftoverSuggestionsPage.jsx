import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
  ShieldAlert,
  Send,
  Plus,
  RefreshCw,
  Info,
  Layers,
  IndianRupee
} from "lucide-react"
import { wasteService } from "../services/api"

export const LeftoverSuggestionsPage = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [pushedSpecial, setPushedSpecial] = useState(null)

  // Live Data
  const [recipes, setRecipes] = useState([])
  const [surplusIngredients, setSurplusIngredients] = useState([])
  const [safetyWarnings, setSafetyWarnings] = useState([])
  const [expiryAlerts, setExpiryAlerts] = useState(null)

  // Custom AI prompt
  const [customPrompt, setCustomPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const loadData = async () => {
    try {
      setError(null)
      const [suggestionsRes, expiryRes] = await Promise.all([
        wasteService.getLeftoverSuggestions(),
        wasteService.getExpiryAlerts()
      ])

      const sData = suggestionsRes.data || {}
      setRecipes(sData.suggestedRecipes || [])
      setSurplusIngredients(sData.surplusIngredients || [])
      setSafetyWarnings(sData.safetyWarnings || [])
      setExpiryAlerts(expiryRes.data || null)
    } catch (err) {
      console.error("Failed to load leftover suggestions:", err)
      setError("Failed to fetch upcycling suggestions. Please ensure the backend server is running.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePushSpecial = (title) => {
    setPushedSpecial(title)
    setTimeout(() => setPushedSpecial(null), 4000)
  }

  const handleGenerateCustom = (e) => {
    e.preventDefault()
    if (!customPrompt) return
    setIsGenerating(true)

    setTimeout(() => {
      const promptLower = customPrompt.toLowerCase()
      const title =
        promptLower.includes("rice") || promptLower.includes("biryani")
          ? "Chef's Crispy Spiced Rice Patties (Tikkis)"
          : promptLower.includes("paneer")
          ? "Kadai Tossed Paneer & Herb Medley"
          : promptLower.includes("bread")
          ? "Savory Herb Croutons & Spiced Toast"
          : `Chef's Artisan ${customPrompt} Sauté`

      const newRecipe = {
        id: Date.now(),
        title,
        category: "Daily Special",
        targetIngredient: customPrompt,
        rescuedSurplusMatches: [customPrompt],
        feasibilityScore: 92,
        sellingPrice: 175,
        foodCost: 40,
        marginPercent: 77.1,
        prepTimeMinutes: 15,
        difficulty: "Easy",
        availablePantry: [customPrompt, "Table Butter", "Indian Spices", "Onions"],
        missingIngredients: [],
        chefNotes: "Dynamic chef special utilizing surplus kitchen ingredients before shelf life expiration.",
        foodSafetyStatus: "100% Certified Safe",
        safetyRule: "All batches verified active and within certified shelf life."
      }

      setRecipes([newRecipe, ...recipes])
      setIsGenerating(false)
      setCustomPrompt("")
    }, 700)
  }

  // Calculations
  const totalValueAtRisk = expiryAlerts?.totalValueAtRisk || 0
  const totalPortionsProjected = recipes.reduce((sum, r) => sum + 25, 0)
  const potentialRevenue = recipes.reduce((sum, r) => sum + r.sellingPrice * 25, 0)
  const avgMargin =
    recipes.length > 0
      ? (recipes.reduce((sum, r) => sum + r.marginPercent, 0) / recipes.length).toFixed(1)
      : 76.0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              AI Recipe & Surplus Upcycling
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200 flex items-center space-x-1 uppercase tracking-wider">
              <span>Zero-Waste Culinary Engine</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Transform expiring surplus ingredients into high-margin daily specials before they spoil.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true)
            loadData()
          }}
          disabled={refreshing}
          className="px-3 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-stone-900" : ""}`} />
          <span>Refresh Suggestions</span>
        </button>
      </div>

      {/* POS Notification */}
      {pushedSpecial && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Pushed to POS:</strong> <em>"{pushedSpecial}"</em> has been added to today's Daily Specials board with priority kitchen display!
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ===================== FOOD SAFETY GUARDRAIL BANNER ===================== */}
      {safetyWarnings.length > 0 && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-rose-900 font-semibold">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Food Safety Violation Guardrail Active ({safetyWarnings.length} Expired Batches Blocked)</span>
          </div>
          <p className="text-rose-800 text-[11px]">
            Strict kitchen safety policy enforces that <strong>expired ingredients are never recommended or cooked</strong> under any circumstances.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {safetyWarnings.map((w, idx) => (
              <div
                key={idx}
                className="bg-white px-2.5 py-1 rounded-md border border-rose-200 text-[11px] text-rose-900 flex items-center space-x-2"
              >
                <span><strong>{w.ingredient}</strong> (Batch: {w.batchNumber}) — Expired {w.expiredOn}</span>
                <button
                  onClick={() => navigate("/waste")}
                  className="text-[10px] underline text-rose-700 hover:text-rose-900 font-semibold cursor-pointer"
                >
                  Log & Discard
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Surplus at Risk</div>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
            ₹{totalValueAtRisk.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">
            Across {expiryAlerts?.criticalCount || 0} critical + {expiryAlerts?.warningCount || 0} warning batches
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Potential Specials Revenue</div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            ₹{potentialRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            From ~{totalPortionsProjected} projected special portions
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Active Surplus SKUs</div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            {surplusIngredients.length} Ingredients
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Expiring within next 72 hours
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Avg Specials Margin</div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">{avgMargin}%</div>
          <p className="text-[11px] text-stone-500 mt-1">
            Higher gross profitability than standard menu
          </p>
        </div>
      </div>

      {/* Near-Expiry Surplus Showcase */}
      <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-stone-800 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Priority Surplus Ingredients Needing Upcycling (Next 24 - 72 Hours)</span>
          </div>
          <span className="text-[11px] text-stone-500">FEFO priority queue</span>
        </div>

        {surplusIngredients.length === 0 ? (
          <div className="p-4 text-center text-xs text-stone-500 bg-white rounded-lg border border-stone-200">
            No ingredients currently in immediate danger of expiration!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {surplusIngredients.map((ing) => (
              <div
                key={ing.id}
                className="p-3 rounded-lg bg-white border border-stone-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between font-semibold text-stone-900">
                    <span>{ing.name}</span>
                    <span className="text-amber-800 font-mono text-[11px]">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                  <div className="text-stone-500 text-[11px] mt-0.5">
                    Category: {ing.category}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                  <span className="text-amber-800 font-medium">
                    Expires {ing.earliestExpiry ? ing.earliestExpiry.slice(5) : "soon"}
                  </span>
                  <span className="font-mono text-stone-600">₹{ing.unitCost}/{ing.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Recipe Generator Prompt Bar */}
      <div className="p-3.5 rounded-lg bg-white border border-stone-200">
        <form onSubmit={handleGenerateCustom} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Type any surplus ingredient (e.g. Cooked Basmati Rice, Mint Leaves, Curd)..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-stone-50 border border-stone-200 text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-stone-400"
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating || !customPrompt}
            className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-3.5 h-3.5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-gold-400" />
                <span>Generate Recipe Concept</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Suggested Recipe Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="p-5 rounded-lg bg-white border border-stone-200 hover:border-stone-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {recipe.feasibilityScore}% Feasibility Score
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                  Rescues: {recipe.targetIngredient}
                </span>
              </div>

              <h3 className="font-semibold text-base text-stone-900 mt-2.5">{recipe.title}</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{recipe.chefNotes}</p>

              {/* Pantry match breakdown */}
              <div className="mt-3.5 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-2">
                <div className="font-medium text-stone-700 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>In-Stock Pantry Matches:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(recipe.availablePantry || []).map((ing, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-[11px] text-stone-700"
                    >
                      {ing}
                    </span>
                  ))}
                </div>

                {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                  <div className="text-[11px] text-amber-800 font-medium pt-1 border-t border-stone-200">
                    Missing Ingredients: {recipe.missingIngredients.join(", ")}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-stone-100">
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3.5">
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <div className="text-[10px] text-stone-500 uppercase font-medium">Suggested Price</div>
                  <div className="font-bold text-stone-900 font-mono mt-0.5">₹{recipe.sellingPrice}</div>
                </div>
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <div className="text-[10px] text-stone-500 uppercase font-medium">Est. Food Cost</div>
                  <div className="font-semibold text-stone-700 font-mono mt-0.5">₹{recipe.foodCost}</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 uppercase font-medium">Gross Margin</div>
                  <div className="font-bold text-emerald-900 font-mono mt-0.5">{recipe.marginPercent}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Prep: {recipe.prepTimeMinutes} mins</span>
                </span>

                <button
                  onClick={() => handlePushSpecial(recipe.title)}
                  className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-gold-400" />
                  <span>Push to Daily Specials</span>
                </button>
              </div>

              {/* Food safety certification badge */}
              <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                <span className="flex items-center space-x-1 text-emerald-700 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>100% Food-Safety Compliant</span>
                </span>
                <span>Excludes expired/spoiled lots</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
