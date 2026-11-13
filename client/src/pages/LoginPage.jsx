import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChefHat, Lock, User, ArrowRight, AlertCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export const LoginPage = () => {
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("admin123")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await login(username, password)
      if (res.success) {
        navigate("/")
      } else {
        setError(res.message || "Invalid credentials")
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to connect to backend server")
    } finally {
      setLoading(false)
    }
  }

  const setPreset = (u, p) => {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl shadow-emerald-950/20">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">AI Kitchen Intelligence</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to access your operations dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username / Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm text-white flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            <span>{loading ? "Authenticating..." : "Sign In to Kitchen"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs font-medium text-slate-400 text-center mb-3">Quick Demo Login Presets:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setPreset("admin", "admin123")}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 transition text-left"
            >
              <div className="font-semibold text-emerald-400">Admin</div>
              <div className="text-[10px] text-slate-500">admin / admin123</div>
            </button>
            <button
              onClick={() => setPreset("chef_vikram", "chef123")}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 transition text-left"
            >
              <div className="font-semibold text-teal-400">Head Chef</div>
              <div className="text-[10px] text-slate-500">chef_vikram / chef123</div>
            </button>
            <button
              onClick={() => setPreset("manager_priya", "manager123")}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 transition text-left"
            >
              <div className="font-semibold text-amber-400">Store Manager</div>
              <div className="text-[10px] text-slate-500">manager_priya / manager123</div>
            </button>
            <button
              onClick={() => setPreset("staff_rahul", "staff123")}
              className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-300 transition text-left"
            >
              <div className="font-semibold text-blue-400">Kitchen Staff</div>
              <div className="text-[10px] text-slate-500">staff_rahul / staff123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

