"use client"

import type React from "react"

import { useState } from "react"
import {
  Home,
  Users,
  Calendar,
  Stethoscope,
  Heart,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Users, label: "Pacientes", href: "/patients" },
  { icon: Calendar, label: "Consultas", href: "/appointments" },
  { icon: Stethoscope, label: "Medicos", href: "/doctors" },
  { icon: Heart, label: "Obras Sociales", href: "/insurance" },
]

const toolItems: NavItem[] = [
  { icon: Settings, label: "Configuracion", href: "/settings" },
  { icon: HelpCircle, label: "Ayuda", href: "/help" },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeItem, setActiveItem] = useState("Home")

  const handleLogout = () => {
    console.log("Logout clicked")
    // Add your logout logic here
  }

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Toggle Button */}
      <div className="flex h-14 items-center justify-end border-b border-border px-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.label

          return (
            <button
              key={item.label}
              onClick={() => setActiveItem(item.label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        {/* Tools Section */}
        {toolItems.map((item) => {
          const Icon = item.icon
          const isActive = activeItem === item.label

          return (
            <button
              key={item.label}
              onClick={() => setActiveItem(item.label)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center",
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User Account Section */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-md p-2 text-sm transition-colors hover:bg-accent",
                isCollapsed && "justify-center",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src="/caring-doctor.png" alt="Diego Silva" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">DS</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Diego Silva</p>
                  <p className="text-xs text-muted-foreground">diegosilva@mail.com</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
