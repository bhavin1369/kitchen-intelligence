import React from "react"
import { Trash2 } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const WasteManagementPage = () => (
  <ModulePlaceholder
    title="Food Waste Intelligence"
    description="Waste logging for raw and prepared foods, reason attribution, and financial loss tracking."
    phase="Phase 5"
    badge="Module 8"
    icon={Trash2}
  />
)

