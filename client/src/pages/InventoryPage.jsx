import React from "react"
import { Boxes } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const InventoryPage = () => (
  <ModulePlaceholder
    title="Smart Inventory & Batches"
    description="Real-time ingredient stock, FEFO batch inspection, unit conversion, and par-level audits."
    phase="Phase 2"
    badge="Module 5"
    icon={Boxes}
  />
)

