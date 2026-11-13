import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChefHat, Lock, User, ArrowRight, ShieldCheck, Sparkles } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export const LoginPage = () => {
  const [username, setUsername] = useState("chef_vikram")
  const [password, setPassword] = useState("chef123")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(username, password)
      if (res.success) {
        navigate("/")
      }
    } finally {
      setLoading(false)
    }
  }

  const setPreset = (u, p) => {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 p-4 font-sans text-stone-800">
      <div className="w-full max-w-md bg-white border border-warm-200 p-8 rounded-2xl shadow-xl shadow-stone-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-forest-900 items-center justify-center shadow-lg shadow-forest-900/20 mb-4 border border-forest-800">
            <ChefHat className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-2xl font-bold text-forest-900 tracking-tight">SpiceCraft Kitchen</h1>
          <p className="text-sm text-stone-500 mt-1">AI-Powered Kitchen Intelligence System</p>
        </div>

        <div className="mb-6 p-3 rounded-xl bg-forest-50 border border-forest-100 text-xs text-forest-800 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-forest-700 shrink-0" />
          <span>Standalone Mode Active — One-click role presets enabled</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
              Username / Staff ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-warm-50/50 border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-900/10 focus:border-forest-800 transition"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">
              Security PIN / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-warm-50/50 border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-900/10 focus:border-forest-800 transition"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-forest-900 hover:bg-forest-950 text-white font-semibold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 border border-forest-800 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Kitchen Command</span>
                <ArrowRight className="w-4 h-4 text-gold-400" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-100">
          <p className="text-xs text-stone-500 font-medium mb-3 text-center">Quick Demo Presets</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPreset("chef_vikram", "chef123")}
              className="p-2 text-center rounded-lg bg-warm-100 hover:bg-warm-200/80 border border-warm-200 transition text-[11px] font-medium text-stone-700"
            >
              <div className="font-semibold text-forest-900">Head Chef</div>
              <div className="text-[10px] text-stone-500">Vikram S.</div>
            </button>
            <button
              type="button"
              onClick={() => setPreset("manager_ananya", "mgr123")}
              className="p-2 text-center rounded-lg bg-warm-100 hover:bg-warm-200/80 border border-warm-200 transition text-[11px] font-medium text-stone-700"
            >
              <div className="font-semibold text-forest-900">Manager</div>
              <div className="text-[10px] text-stone-500">Ananya I.</div>
            </button>
            <button
              type="button"
              onClick={() => setPreset("admin_aditya", "admin123")}
              className="p-2 text-center rounded-lg bg-warm-100 hover:bg-warm-200/80 border border-warm-200 transition text-[11px] font-medium text-stone-700"
            >
              <div className="font-semibold text-forest-900">Admin</div>
              <div className="text-[10px] text-stone-500">Operations</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
