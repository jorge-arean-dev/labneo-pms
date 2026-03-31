"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClinicInfoTabContent } from "./clinic-info-tab-content"
import { EmailTabContent } from "./email-tab-content"
import type { EmailConfig, ClinicInfo } from "@/lib/email/types"

interface AdminPageProps {
  emailConfig: EmailConfig | null
  clinicInfo: ClinicInfo | null
}

export function AdminPage({ emailConfig, clinicInfo }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState("lab")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Administración</h1>
        <p className="text-muted-foreground">
          Configure los ajustes del sistema y servicios
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="lab">Información del Laboratorio</TabsTrigger>
          <TabsTrigger value="email">Notificaciones por Email</TabsTrigger>
        </TabsList>

        <TabsContent value="lab" className="space-y-6">
          <ClinicInfoTabContent clinicInfo={clinicInfo} />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <EmailTabContent emailConfig={emailConfig} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
