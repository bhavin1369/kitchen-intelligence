import React from "react"
import { UtensilsCrossed } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const MenuRecipesPage = () => (
  <ModulePlaceholder
    title="Menu & Recipe Engineering"
    description="Categorized dish catalog, interactive Bill of Materials, portion yield % and live cost-per-serving calculations."
    phase="Phase 2"
    badge="Module 3"
    icon={UtensilsCrossed}
  />
)

