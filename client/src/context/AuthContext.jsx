import React, { createContext, useContext, useState, useEffect } from "react"
import api from "../services/api"

const AuthContext = createContext(null)

const DEFAULT_MOCK_USER = {
  id: 1,
  username: "chef_vikram",
  fullName: "Vikram Sharma",
  role: "Head Chef",
  email: "chef.vikram@spicecraft.com",
  restaurant: "SpiceCraft Kitchen & Dining",
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("kitchen_user")
      return stored ? JSON.parse(stored) : DEFAULT_MOCK_USER
    } catch {
      return DEFAULT_MOCK_USER
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem("kitchen_token") || "mock_jwt_token_demo")
  const [loading, setLoading] = useState(false)

  // Try to sync with backend if running, but keep mock user as reliable fallback
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("kitchen_token")
      if (storedToken && storedToken !== "mock_jwt_token_demo") {
        try {
          const res = await api.get("/auth/me")
          if (res.data?.success) {
            setUser(res.data.data)
            localStorage.setItem("kitchen_user", JSON.stringify(res.data.data))
          }
        } catch {
          // If offline or backend not started yet, retain existing local mock state
        }
      }
    }
    checkAuth()
  }, [])

  const login = async (username, password) => {
    try {
      // Try backend first
      const res = await api.post("/auth/login", { username, password })
      if (res.data?.success) {
        const { token: newToken, user: userData } = res.data.data
        setToken(newToken)
        setUser(userData)
        localStorage.setItem("kitchen_token", newToken)
        localStorage.setItem("kitchen_user", JSON.stringify(userData))
        return { success: true }
      }
    } catch {
      // Standalone Mock Mode for Phase 1 Frontend
      let role = "Kitchen Manager"
      let fullName = "Kitchen User"
      if (username.toLowerCase().includes("chef") || username === "vikram") {
        role = "Head Chef"
        fullName = "Vikram Sharma"
      } else if (username.toLowerCase().includes("admin")) {
        role = "Administrator"
        fullName = "Aditya Verma"
      } else if (username.toLowerCase().includes("clerk") || username === "rahul") {
        role = "Inventory Clerk"
        fullName = "Rahul Mehta"
      }

      const mockUserData = {
        id: Date.now(),
        username: username || "manager",
        fullName,
        role,
        email: `${username || "manager"}@spicecraft.com`,
        restaurant: "SpiceCraft Kitchen & Dining",
      }

      setToken("mock_jwt_token_demo")
      setUser(mockUserData)
      localStorage.setItem("kitchen_token", "mock_jwt_token_demo")
      localStorage.setItem("kitchen_user", JSON.stringify(mockUserData))
      return { success: true }
    }
    return { success: false, message: "Invalid credentials" }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("kitchen_token")
    localStorage.removeItem("kitchen_user")
  }

  const switchRole = (newRole, newName) => {
    const updated = {
      ...user,
      role: newRole,
      fullName: newName || user.fullName,
    }
    setUser(updated)
    localStorage.setItem("kitchen_user", JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
