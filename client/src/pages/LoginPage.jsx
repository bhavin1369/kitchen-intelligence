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
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans text-stone-800">
      <div className="w-full max-w-sm bg-white border border-stone-200 p-6 sm:p-8 rounded-lg shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-lg bg-forest-900 items-center justify-center mb-3 shadow-xs">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">SpiceCraft Kitchen</h1>
          <p className="text-xs text-stone-500 mt-0.5">AI-Powered Kitchen Intelligence System</p>
        </div>

        <div className="mb-5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Standalone Mode Active — One-click role presets enabled</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 uppercase tracking-wider">
              Username / Staff ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-hidden transition"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 mb-1 uppercase tracking-wider">
              Security PIN / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:border-stone-400 focus:outline-hidden transition"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 px-4 rounded-lg bg-forest-900 hover:bg-forest-800 text-white font-medium text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Kitchen Command</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-100">
          <p className="text-[11px] text-stone-500 font-medium mb-2.5 text-center">Quick Demo Presets</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPreset("chef_vikram", "chef123")}
              className="p-2 text-center rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 transition text-[11px] font-medium text-stone-700 cursor-pointer"
            >
              <div className="font-semibold text-stone-900">Head Chef</div>
              <div className="text-[10px] text-stone-500">Vikram S.</div>
            </button>
            <button
              type="button"
              onClick={() => setPreset("manager_ananya", "mgr123")}
              className="p-2 text-center rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 transition text-[11px] font-medium text-stone-700 cursor-pointer"
            >
              <div className="font-semibold text-stone-900">Manager</div>
              <div className="text-[10px] text-stone-500">Ananya I.</div>
            </button>
            <button
              type="button"
              onClick={() => setPreset("admin_aditya", "admin123")}
              className="p-2 text-center rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 transition text-[11px] font-medium text-stone-700 cursor-pointer"
            >
              <div className="font-semibold text-stone-900">Admin</div>
              <div className="text-[10px] text-stone-500">Operations</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
