import React from "react"
import { Settings } from "lucide-react"
import { ModulePlaceholder } from "../components/ui/ModulePlaceholder"

export const SettingsPage = () => (
  <ModulePlaceholder
    title="Settings & Indian Calendar Config"
    description="Role-Based Access Control, Indian festival calendar manager, and par-level threshold customization."
    phase="Phase 1-6"
    badge="Module 12"
    icon={Settings}
  />
)

