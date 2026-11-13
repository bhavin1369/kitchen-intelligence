import React, { useState, useEffect } from "react"
import { Bell, Activity, Sparkles } from "lucide-react"
import api from "../../services/api"

export const Navbar = () => {
  const [dbStatus, setDbStatus] = useState("checking")
  const [now, setNow] = useState(new Date().toLocaleTimeString())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    api.get("/health")
      .then((res) => {
        if (res.data.status === "healthy") setDbStatus("healthy")
        else setDbStatus("error")
      })
      .catch(() => setDbStatus("offline"))
  }, [])

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <h2 className="text-sm font-semibold text-slate-200">
          SpiceCraft Kitchen & Dining
        </h2>
        <span className="text-xs text-slate-500">|</span>
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Real-Time Engine:</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            dbStatus === "healthy"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : dbStatus === "checking"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
          }`}>
            {dbStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
          {now}
        </span>
        <button className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950" />
        </button>
      </div>
    </header>
  )
}

