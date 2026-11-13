import React from "react"
import { AlertTriangle } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const ExpiryAlertsPage = () => (
  <ModulePlaceholder
    title="Batch Expiry Sentinel"
    description="FEFO (First-Expired, First-Out) timeline tracking, critical 48h warning pills, and consume-first priority queues."
    phase="Phase 5"
    badge="Module 9"
    icon={AlertTriangle}
  />
)

