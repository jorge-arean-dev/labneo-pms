"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailTabContent } from "./email-tab-content"
import { ClinicInfoTabContent } from "./clinic-info-tab-content"
import { AgentTabContent } from "./agent-tab-content"
import type { EmailConfig, ClinicInfo } from "@/lib/email/types"
import type { EmailTemplates } from "../actions"

interface AdminPageProps {
  emailConfig: EmailConfig | null
  clinicInfo: ClinicInfo | null
  emailTemplates: EmailTemplates | null
}

export function AdminPage({ emailConfig, clinicInfo, emailTemplates }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState("email")

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
          <TabsTrigger value="email">Notificaciones por Email</TabsTrigger>
          <TabsTrigger value="clinic">Información del Consultorio</TabsTrigger>
          <TabsTrigger value="agent">Agente WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          <EmailTabContent emailConfig={emailConfig} emailTemplates={emailTemplates} />
        </TabsContent>

        <TabsContent value="clinic" className="space-y-6">
          <ClinicInfoTabContent clinicInfo={clinicInfo} />
        </TabsContent>

        <TabsContent value="agent" className="space-y-6">
          <AgentTabContent clinicInfo={clinicInfo} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
