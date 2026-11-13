import React, { useState } from "react"
import {
  TrendingUp,
  Sparkles,
  Calendar,
  CloudSun,
  Layers,
  RefreshCw,
  CheckCircle2,
  Info,
  ChevronRight,
  Sliders,
  Filter
} from "lucide-react"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { demandComparison, indianCalendarEvents, menuCatalog } from "../data/mockData"

export const ForecastPage = () => {
  const [selectedDish, setSelectedDish] = useState("all")
  const [horizon, setHorizon] = useState("7days")
  const [isRetraining, setIsRetraining] = useState(false)
  const [retrainSuccess, setRetrainSuccess] = useState(false)

  const handleRetrain = () => {
    setIsRetraining(true)
    setRetrainSuccess(false)
    setTimeout(() => {
      setIsRetraining(false)
      setRetrainSuccess(true)
      setTimeout(() => setRetrainSuccess(false), 4000)
    }, 1200)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-warm-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-900 tracking-tight">
              AI Demand Forecasting
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-forest-100 text-forest-800 border border-forest-200">
              Scikit-Learn ML
            </span>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Predict customer demand, portion volumes, and holiday surges to prevent stockouts and food waste.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={isRetraining}
          className="px-4 py-2.5 rounded-lg bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold shadow-md transition flex items-center space-x-2 cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-gold-400 ${isRetraining ? "animate-spin" : ""}`} />
          <span>{isRetraining ? "Retraining Models..." : "Retrain ML Engine"}</span>
        </button>
      </div>

      {retrainSuccess && (
        <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-forest-700" />
            <span>
              <strong>Model Retrained:</strong> 90 days of POS data re-indexed. Best model: <em>Ridge + Indian Calendar Regressors</em> (MAE: 3.12 portions).
            </span>
          </div>
          <span className="text-[10px] text-forest-700 font-mono">Just now</span>
        </div>
      )}

      {/* Model Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Active ML Algorithm</div>
          <div className="text-xl font-bold text-forest-900 mt-2">Ridge + Prophet Mix</div>
          <p className="text-[11px] text-stone-500 mt-1">L2 Regularization with Festival Dummies</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Model Accuracy (MAE)</div>
          <div className="text-xl font-bold text-emerald-700 mt-2">±3.2 Portions</div>
          <p className="text-[11px] text-stone-500 mt-1">R² Score: 0.91 (Strong predictive power)</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Next 7-Day Forecast</div>
          <div className="text-xl font-bold text-stone-900 mt-2">1,092 Portions</div>
          <p className="text-[11px] text-stone-500 mt-1">Across all 12 menu categories</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Diwali Event Spike</div>
          <div className="text-xl font-bold text-gold-700 mt-2">+35% Anticipated</div>
          <p className="text-[11px] text-stone-500 mt-1">Active from Oct 28 - Nov 03</p>
        </div>
      </div>

      {/* Controls & Dish Selection */}
      <div className="p-4 rounded-xl bg-white border border-warm-200 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
          <span className="font-semibold text-stone-600 shrink-0">Forecast Dish:</span>
          <select
            value={selectedDish}
            onChange={(e) => setSelectedDish(e.target.value)}
            className="px-3 py-2 rounded-lg bg-warm-50 border border-warm-200 text-stone-800 text-xs w-full sm:w-64"
          >
            <option value="all">Aggregate All Dishes (Total Kitchen Volume)</option>
            {menuCatalog.map((dish) => (
              <option key={dish.id} value={dish.name}>
                {dish.name} ({dish.category})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs w-full sm:w-auto justify-end">
          <span className="font-semibold text-stone-600">Horizon:</span>
          <button
            onClick={() => setHorizon("7days")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              horizon === "7days" ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700"
            }`}
          >
            7 Days Ahead
          </button>
          <button
            onClick={() => setHorizon("14days")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              horizon === "14days" ? "bg-forest-900 text-white" : "bg-warm-100 text-stone-700"
            }`}
          >
            14 Days Ahead
          </button>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Demand Trajectory & Confidence Envelope (95% CI)
            </h2>
            <p className="text-xs text-stone-500">
              Actual sales (solid green) vs Model predictions (golden line) with shaded upper/lower boundaries
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1 text-forest-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-forest-700 inline-block" />
              <span>Actual Portions</span>
            </span>
            <span className="flex items-center space-x-1 text-gold-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-gold-500 inline-block" />
              <span>AI Forecast</span>
            </span>
            <span className="flex items-center space-x-1 text-stone-400">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-300 inline-block" />
              <span>95% CI Range</span>
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={demandComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1efe7" />
              <XAxis dataKey="day" stroke="#78716c" fontSize={10} tickLine={false} />
              <YAxis stroke="#78716c" fontSize={11} tickLine={false} />
              <Tooltip
                formatter={(val, name) => [
                  val ? `${val} portions` : "Pending",
                  name === "actual" ? "Actual Sales" : name === "predicted" ? "AI Predicted" : "Baseline"
                ]}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e7e5e4",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  fontSize: "12px"
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="actual" fill="#15803d" name="Actual Orders" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#d97706"
                strokeWidth={3}
                dot={{ r: 4, fill: "#d97706" }}
                name="AI Predicted Demand"
              />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="url(#ciGrad)"
                name="Confidence Range"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Indian Calendar & External Feature Multipliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Indian Cultural & Calendar Factors
              </h2>
              <p className="text-xs text-stone-500">
                Special multipliers trained on Indian festival dining patterns
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold-100 text-gold-800 border border-gold-300">
              Active Regressors
            </span>
          </div>

          <div className="divide-y divide-warm-100 text-xs">
            {indianCalendarEvents.map((evt) => (
              <div key={evt.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900">{evt.name}</div>
                  <div className="text-stone-500 text-[11px]">
                    {evt.dateRange} • {evt.categoryImpact}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-forest-50 text-forest-800 border border-forest-200">
                    +{Math.round((evt.multiplier - 1) * 100)}% ({evt.multiplier}x)
                  </span>
                  <div className="text-[10px] text-stone-400 mt-0.5">Applied to model weights</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-warm-200 shadow-card space-y-3">
          <h2 className="text-sm font-bold text-stone-900 flex items-center space-x-1.5">
            <CloudSun className="w-4 h-4 text-amber-500" />
            <span>Weather & Real-time Modifiers</span>
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed">
            The AI combines temperature, humidity, and rain probabilities into feature arrays:
          </p>

          <div className="p-3 rounded-xl bg-warm-50 border border-warm-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-600">Weekend Surge:</span>
              <span className="font-bold text-forest-900">+25% Dinner volume</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Rainfall / Monsoon:</span>
              <span className="font-bold text-forest-900">+40% Biryani / Delivery</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Month-End Payday:</span>
              <span className="font-bold text-forest-900">+18% Premium dining</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 text-[11px] text-forest-900">
            <strong>Closed-Loop Integration:</strong> Forecasted numbers automatically populate the{" "}
            <strong>Purchase Planner</strong> to formulate recommended supplier Purchase Orders.
          </div>
        </div>
      </div>
    </div>
  )
}
