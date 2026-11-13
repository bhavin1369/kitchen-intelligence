import React from "react"
import { ShoppingCart } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const ProcurementPage = () => (
  <ModulePlaceholder
    title="Ingredient Requirements & Smart Purchasing"
    description="Mathematical conversion of forecasted demand to net shortages and supplier-grouped Purchase Orders."
    phase="Phase 4"
    badge="Module 6 & 7"
    icon={ShoppingCart}
  />
)

