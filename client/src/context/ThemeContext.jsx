import React, { createContext, useContext, useState, useEffect } from "react"

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("kitchen_theme")
      if (saved) return saved
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } catch {
      return "light"
    }
  })

  useEffect(() => {
    try {
      const root = document.documentElement
      if (theme === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
      localStorage.setItem("kitchen_theme", theme)
    } catch (err) {
      console.error("Theme storage error:", err)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const isDark = theme === "dark"

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

