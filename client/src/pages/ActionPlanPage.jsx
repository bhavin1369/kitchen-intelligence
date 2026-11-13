import React, { useState, useEffect } from "react"
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Printer,
  RefreshCw,
  Save,
  Clock,
  Sparkles,
  UtensilsCrossed,
  ChefHat,
  ShoppingCart,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Layers,
  CheckSquare,
  Square,
  UserCheck
} from "lucide-react"
import { actionPlanService } from "../services/api"

export const ActionPlanPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Plan State
  const [plan, setPlan] = useState(null)
  const [menuTargets, setMenuTargets] = useState([])
  const [prepTasks, setPrepTasks] = useState([])
  const [urgentPurchases, setUrgentPurchases] = useState([])
  const [fefoPriorities, setFefoPriorities] = useState([])
  const [riskAlerts, setRiskAlerts] = useState([])
  const [managerNotes, setManagerNotes] = useState("")
  const [signedOffBy, setSignedOffBy] = useState("Executive Chef")
  const [planStatus, setPlanStatus] = useState("draft")

  const showNotification = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Fetch plan for selected date
  const loadPlan = async (targetDate = selectedDate) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await actionPlanService.getPlan({ date: targetDate })
      const data = res.data?.data || {}
      setPlan(data)
      setMenuTargets(data.menuTargets || [])
      setPrepTasks(data.prepTasks || [])
      setUrgentPurchases(data.urgentPurchases || [])
      setFefoPriorities(data.fefoPriorities || [])
      setRiskAlerts(data.riskAlerts || [])
      setManagerNotes(data.managerNotes || "")
      setSignedOffBy(data.signedOffBy || "Executive Chef")
      setPlanStatus(data.status || "draft")
    } catch (err) {
      console.error("Failed to load daily action plan:", err)
      setErrorMessage("Failed to load action plan. Please check backend connection.")
    } finally {
      setLoading(false)
      setResetting(false)
    }
  }

  useEffect(() => {
    loadPlan(selectedDate)
  }, [selectedDate])

  // Handle adjusted portions edit
  const handlePortionChange = (index, value) => {
    const val = parseFloat(value) || 0
    const updated = [...menuTargets]
    updated[index].adjustedPortions = Math.max(0, val)
    setMenuTargets(updated)
  }

  // Toggle prep task checkbox
  const togglePrepTask = (taskId) => {
    setPrepTasks((prev) =>
      prev.map((t) => (t.taskId === taskId ? { ...t, completed: !t.completed } : t))
    )
  }

  // Save edits
  const handleSavePlan = async () => {
    setSaving(true)
    try {
      const payload = {
        status: planStatus,
        menuTargets,
        prepTasks,
        urgentPurchases,
        fefoPriorities,
        riskAlerts,
        managerNotes,
        signedOffBy
      }
      const res = await actionPlanService.updatePlan(selectedDate, payload)
      if (res.data?.success) {
        showNotification("Daily Action Plan saved successfully.")
        setPlan(res.data.data)
      }
    } catch (err) {
      alert("Failed to save action plan: " + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  // Reset from live AI models
  const handleResetPlan = async () => {
    if (!window.confirm("Reset this action plan? This will re-execute AI models and overwrite manager edits.")) return
    setResetting(true)
    try {
      const res = await actionPlanService.resetPlan(selectedDate)
      if (res.data?.success) {
        showNotification("Action plan refreshed from live AI demand models.")
        await loadPlan(selectedDate)
      }
    } catch (err) {
      alert("Failed to reset action plan: " + (err.response?.data?.message || err.message))
      setResetting(false)
    }
  }

  // Calculations
  const totalPortions = menuTargets.reduce((sum, item) => sum + (parseFloat(item.adjustedPortions) || 0), 0)
  const completedPrepCount = prepTasks.filter((t) => t.completed).length
  const urgentPoCost = urgentPurchases.reduce((sum, p) => sum + (parseFloat(p.estCost) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Kitchen Daily Action Plan
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${
                planStatus === "approved"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-stone-100 text-stone-700 border border-stone-200"
              }`}
            >
              {planStatus === "approved" ? "Signed Off by Chef" : "Draft Morning Briefing"}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Automated morning operational roadmap: ML demand forecasts, mise-en-place prep, procurement, and FEFO alerts.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Date Picker */}
          <div className="flex items-center space-x-1.5 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-stone-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-medium text-stone-800 focus:outline-hidden bg-transparent"
            />
          </div>

          <button
            onClick={handleResetPlan}
            disabled={resetting}
            className="px-3 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
            title="Recalculate plan from live AI forecast & inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin text-stone-900" : ""}`} />
            <span>Reset from AI</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span>Print Briefing</span>
          </button>

          <button
            onClick={handleSavePlan}
            disabled={saving}
            className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white text-xs font-medium shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-gold-400" />
            <span>{saving ? "Saving..." : "Save Adjustments"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Target Menu Portions</span>
            <UtensilsCrossed className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            {Math.round(totalPortions)} Portions
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Across {menuTargets.length} active menu dishes
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Mise-en-place Tasks</span>
            <ClipboardCheck className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            {completedPrepCount} / {prepTasks.length} Completed
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            {prepTasks.length - completedPrepCount} preparation items remaining
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Urgent Purchases</span>
            <ShoppingCart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            {urgentPurchases.length} Items (₹{Math.round(urgentPoCost).toLocaleString("en-IN")})
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Immediate vendor reorders required
          </p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-stone-200">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">FEFO Queue</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
            {fefoPriorities.length} Batches Urgent
          </div>
          <p className="text-[11px] text-rose-700 font-medium mt-1">
            Must be consumed in today's menu prep
          </p>
        </div>
      </div>

      {/* ===================== SECTION 1: EXPECTED MENU DEMAND ===================== */}
      <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-stone-200">
          <div>
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-stone-600" />
              <span>1. Expected Menu Demand & Portions (AI ML Forecasts)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Machine learning predictions with 95% Confidence Intervals. Kitchen managers can adjust targets as needed.
            </p>
          </div>
          <span className="text-[11px] text-stone-400">Values are user-editable</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-600 border-y border-stone-200 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Menu Dish</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">AI Predicted Demand</th>
                <th className="py-2.5 px-3 text-right">95% Confidence Band</th>
                <th className="py-2.5 px-3 text-right font-semibold text-stone-900">Adjusted Kitchen Target</th>
                <th className="py-2.5 px-3">Driver Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {(menuTargets || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-stone-50/50 transition">
                  <td className="py-2.5 px-3 font-semibold text-stone-900">
                    {item.dishName}
                  </td>
                  <td className="py-2.5 px-3 text-stone-500">{item.category}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-stone-900 text-right">
                    {item.predictedPortions} portions
                  </td>
                  <td className="py-2.5 px-3 font-mono text-stone-500 text-right">
                    {item.confidenceRange}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.adjustedPortions}
                        onChange={(e) => handlePortionChange(idx, e.target.value)}
                        className="w-16 px-2 py-1 rounded bg-stone-50 border border-stone-200 font-mono font-semibold text-xs text-right focus:bg-white focus:outline-none focus:border-stone-400"
                      />
                      <span className="text-[11px] text-stone-400">portions</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-stone-600 text-[11px]">
                    {item.driverNote}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================== SECTION 2: MISE-EN-PLACE PREP TASKS ===================== */}
      <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-stone-200">
          <div>
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
              <ClipboardCheck className="w-3.5 h-3.5 text-stone-600" />
              <span>2. Mise-en-place Ingredient Prep Tasks (Recipe BOM Explosion)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Raw ingredients required for today's menu targets, accounting for trim loss. Check off items as prep finishes.
            </p>
          </div>
          <span className="text-xs font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
            {completedPrepCount} of {prepTasks.length} Completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {(prepTasks || []).map((task) => (
            <div
              key={task.taskId}
              onClick={() => togglePrepTask(task.taskId)}
              className={`p-3 rounded-lg border transition cursor-pointer flex items-start space-x-2.5 ${
                task.completed
                  ? "bg-stone-50 border-stone-200 text-stone-400"
                  : "bg-white border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {task.completed ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-stone-400" />
                )}
              </div>

              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between font-semibold text-stone-900">
                  <span className={task.completed ? "line-through text-stone-400" : ""}>
                    {task.name}
                  </span>
                  <span className="font-mono text-stone-900">
                    {task.requiredQuantity} {task.unit}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-between">
                  <span>Station: {task.assignedStation}</span>
                  <span>{task.contributingDishesCount} dishes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===================== SECTION 3: URGENT PURCHASES & FEFO ROTATION ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Urgent Purchases */}
        <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
              <ShoppingCart className="w-3.5 h-3.5 text-stone-600" />
              <span>3. Urgent Morning Purchases (Deficit Replenishment)</span>
            </h3>
            <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              {urgentPurchases.length} Items
            </span>
          </div>

          {(!urgentPurchases || urgentPurchases.length === 0) ? (
            <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-lg border border-stone-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span>Sufficient stock on hand for today's service! Zero urgent purchases needed.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {(urgentPurchases || []).map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-stone-900">{p.name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Current: {p.usableStock} {p.unit} • Supplier: {p.preferredSupplier}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-stone-900">
                      Order: {p.neededQuantity} {p.unit}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono">₹{p.estCost}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FEFO Rotation & Waste Alerts */}
        <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>4. Near-Expiry FEFO Stock & Waste Alerts</span>
            </h3>
            <span className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              Priority Cook
            </span>
          </div>

          <div className="space-y-2">
            {(fefoPriorities || []).map((f, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-stone-900">{f.ingredientName}</div>
                  <div className="text-[11px] text-rose-700 font-medium">
                    Batch: {f.batchNumber} • Expires in {f.daysToExpiry} days
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{f.directive}</div>
                </div>
                <div className="text-right font-mono font-bold text-rose-700">
                  {f.remainingQuantity} {f.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================== SECTION 5: MANAGER SIGN-OFF ===================== */}
      <div className="p-4 rounded-lg bg-white border border-stone-200 space-y-3">
        <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
          <UserCheck className="w-3.5 h-3.5 text-stone-600" />
          <span>5. Executive Chef / Manager Operational Sign-off</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">Morning Operational Notes</label>
            <textarea
              rows={3}
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
              placeholder="e.g. Verified cold storage temperatures, assigned extra prep helper to curry station..."
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Signed Off By</label>
              <input
                type="text"
                value={signedOffBy}
                onChange={(e) => setSignedOffBy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-400 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-stone-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={planStatus === "approved"}
                  onChange={(e) => setPlanStatus(e.target.checked ? "approved" : "draft")}
                  className="rounded text-forest-900 w-4 h-4"
                />
                <span>Approve and Lock Morning Briefing</span>
              </label>

              <button
                onClick={handleSavePlan}
                disabled={saving}
                className="px-3.5 py-2 rounded-lg bg-forest-900 hover:bg-forest-800 text-white font-medium text-xs shadow-xs cursor-pointer"
              >
                {saving ? "Saving..." : "Save Action Plan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

