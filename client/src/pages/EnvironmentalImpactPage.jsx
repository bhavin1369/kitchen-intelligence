import React, { useState, useEffect } from "react"
import {
  Leaf,
  Droplets,
  Wind,
  Trees,
  Car,
  TrendingDown,
  Info,
  Calendar,
  Download,
  Printer,
  CheckCircle2,
  Sparkles,
  Layers,
  ShieldCheck,
  RefreshCw
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { environmentalService } from "../services/api"

export const EnvironmentalImpactPage = () => {
  const [periodDays, setPeriodDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [impactData, setImpactData] = useState(null)
  const [error, setError] = useState(null)

  const loadData = async (days = periodDays) => {
    try {
      setError(null)
      const res = await environmentalService.getImpact({ days })
      setImpactData(res.data)
    } catch (err) {
      console.error("Failed to load environmental impact data:", err)
      setError("Failed to fetch environmental tracker data.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(periodDays)
  }, [periodDays])

  const summary = impactData?.summary || {}
  const monthlyTrends = (impactData?.monthlyTrends || []).map((m) => ({
    month: m.month,
    wasteKg: m.wasteKg,
    co2eKg: m.co2eEmissionsKg,
    waterLiters: Math.round(m.waterFootprintLiters)
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Environmental Impact Tracker
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>ESG Sustainability</span>
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Quantifying greenhouse gas mitigation, water conservation, and landfill diversion through AI kitchen optimization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex bg-stone-100 p-0.5 rounded-lg text-xs font-medium">
            {[30, 90, 180].map((d) => (
              <button
                key={d}
                onClick={() => setPeriodDays(d)}
                className={`px-2.5 py-1 rounded-md transition ${
                  periodDays === d
                    ? "bg-white text-stone-900 font-semibold shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {d === 30 ? "Last 30 Days" : d === 90 ? "Quarter (90d)" : "Half Year"}
              </button>
            ))}
          </div>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Hero Environmental Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-lg bg-white border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Avoided GHG Emissions</span>
              <Wind className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
              {(summary.avoidedCO2eKg || 0).toLocaleString("en-IN")} kg
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              CO₂e greenhouse emissions prevented vs unoptimized baseline
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-emerald-800 font-medium flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Factor: 2.5 kg CO₂e / kg food waste</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Freshwater Conserved</span>
              <Droplets className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-blue-700 mt-2">
              {(summary.avoidedWaterLiters || 0).toLocaleString("en-IN")} L
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Embedded agricultural irrigation water footprint saved
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-blue-800 font-medium flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Factor: 1,250 Liters / kg food waste</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Mature Trees Equivalent</span>
              <Trees className="w-4 h-4 text-stone-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-stone-900 mt-2">
              {summary.equivalencies?.treesPlantedAnnualEquivalent || 0} Trees
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Annual carbon sequestration capacity equivalent
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center space-x-1">
            <span>Basis: 21.8 kg CO₂ sequestered / tree / year</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white border border-stone-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Vehicle Kilometers Saved</span>
              <Car className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-800 mt-2">
              {Math.round(summary.equivalencies?.passengerCarKmSaved || 0).toLocaleString("en-IN")} km
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Equivalent passenger car travel emissions avoided
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center space-x-1">
            <span>Basis: EPA Standard ~0.12 kg CO₂ / km</span>
          </div>
        </div>
      </div>

      {/* Recharts Environmental Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 sm:p-5 rounded-lg bg-white border border-stone-200 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Monthly Greenhouse Gas Footprint (CO₂e)</h3>
            <p className="text-[11px] text-stone-500">Recorded monthly emissions footprint from discarded waste (kg CO₂e)</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} />
                <Tooltip
                  formatter={(val) => [`${val} kg CO₂e`, "Emissions"]}
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: "12px" }}
                />
                <Bar dataKey="co2eKg" fill="#166534" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-lg bg-white border border-stone-200 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Embedded Freshwater Footprint Trend (Liters)</h3>
            <p className="text-[11px] text-stone-500">Embedded water footprint of food waste (Water Footprint Network standard)</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} axisLine={{ stroke: "#e7e5e4" }} />
                <Tooltip
                  formatter={(val) => [`${val.toLocaleString("en-IN")} Liters`, "Embedded Water"]}
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e7e5e4", borderRadius: "6px", fontSize: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="waterLiters"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#2563eb" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Documented Scientific Conversion Standards Card */}
      <div className="p-4 sm:p-5 rounded-lg bg-white border border-stone-200 space-y-4">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-stone-600" />
          <h3 className="text-sm font-semibold text-stone-900">Documented Scientific Conversion Methodology</h3>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          {impactData?.disclaimer ||
            "Environmental impact metrics are estimated based on recorded physical waste quantities and standard conversion factors from the FAO (2.5 kg CO2e/kg) and Water Footprint Network (1,250 L/kg). Avoided waste is benchmarked against standard unoptimized commercial kitchen baselines (4.5% vs actual 1.8%)."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
            <span className="font-semibold text-stone-900">1. Carbon Emissions Factor</span>
            <div className="text-forest-900 font-mono font-semibold text-xs">2.5 kg CO₂e per 1 kg food waste</div>
            <p className="text-[11px] text-stone-500 leading-normal">
              Source: FAO Food Wastage Footprint & UK WRAP Food Waste GHG Protocol.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
            <span className="font-semibold text-stone-900">2. Water Footprint Factor</span>
            <div className="text-blue-900 font-mono font-semibold text-xs">1,250 Liters per 1 kg food waste</div>
            <p className="text-[11px] text-stone-500 leading-normal">
              Source: Water Footprint Network (Mekonnen & Hoekstra, University of Twente).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
            <span className="font-semibold text-stone-900">3. Baseline Benchmark</span>
            <div className="text-stone-900 font-mono font-semibold text-xs">4.5% Baseline vs 1.8% AI System</div>
            <p className="text-[11px] text-stone-500 leading-normal">
              Source: National Restaurant Association & NRDC Commercial Food Waste Assessment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

