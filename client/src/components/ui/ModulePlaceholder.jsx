import React from "react"
import { Sparkles, Construction, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

export const ModulePlaceholder = ({ title, description, phase, badge, icon: Icon }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-100">{title}</h1>
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </Link>
      </div>

      {/* Scaffold Card */}
      <div className="p-10 rounded-2xl bg-slate-950/60 border border-slate-800 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="inline-flex p-4 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400">
          <Construction className="w-8 h-8 animate-bounce" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          {title} Scaffolded
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The database schema, seed tables, and REST endpoints for this module are configured in the backend and ready for {phase} implementation.
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            <span>Ready for {phase}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

