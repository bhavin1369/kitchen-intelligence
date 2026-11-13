import React, { createContext, useContext, useState, useEffect } from "react"
import api from "../services/api"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("kitchen_user")
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem("kitchen_token") || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("kitchen_token")
      if (storedToken) {
        try {
          const res = await api.get("/auth/me")
          if (res.data.success) {
            setUser(res.data.data)
            localStorage.setItem("kitchen_user", JSON.stringify(res.data.data))
          }
        } catch {
          logout()
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password })
    if (res.data.success) {
      const { token: newToken, user: userData } = res.data.data
      setToken(newToken)
      setUser(userData)
      localStorage.setItem("kitchen_token", newToken)
      localStorage.setItem("kitchen_user", JSON.stringify(userData))
      return { success: true }
    }
    return { success: false, message: res.data.message }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("kitchen_token")
    localStorage.removeItem("kitchen_user")
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}

