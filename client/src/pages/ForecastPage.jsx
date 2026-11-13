import React from "react"
import { TrendingUp } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const ForecastPage = () => (
  <ModulePlaceholder
    title="AI Demand Forecasting"
    description="Machine-learned daily demand projections with Indian festival calendars, MAE/RMSE metrics, and explainability factors."
    phase="Phase 3"
    badge="Module 4"
    icon={TrendingUp}
  />
)

