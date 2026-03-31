import type React from "react"
import { Sidebar } from "@/components/sidebar"

export default function AgendarConsultaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      {children}
    </div>
  )
}
