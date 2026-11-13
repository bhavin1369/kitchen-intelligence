import React from "react"
import { Receipt } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const SalesPage = () => (
  <ModulePlaceholder
    title="Sales & POS Management"
    description="Live POS order entry, transaction history, and CSV bulk import/export."
    phase="Phase 2"
    badge="Module 2"
    icon={Receipt}
  />
)

