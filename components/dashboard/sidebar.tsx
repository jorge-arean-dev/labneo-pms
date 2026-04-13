"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  FileText,
  DollarSign,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  KeyRound,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { getRoleColor, getRoleDisplayName } from "@/lib/constants/role-colors"

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  roles: string[] // roles that can see this item
}

const navItems: NavItem[] = [
  {
    icon: FileText,
    label: "Solicitudes",
    href: "/solicitudes",
    roles: ["administracion", "odontologo"],
  },
  {
    icon: KeyRound,
    label: "Acceso Vevi",
    href: "/acceso-vevi",
    roles: ["odontologo"],
  },
  {
    icon: Users,
    label: "Odontólogos",
    href: "/odontologos",
    roles: ["administracion"],
  },
  {
    icon: DollarSign,
    label: "Tarifarios",
    href: "/tarifarios",
    roles: ["administracion"],
  },
]

const toolItems: NavItem[] = [
  {
    icon: Settings,
    label: "Configuración",
    href: "/configuracion",
    roles: ["administracion", "odontologo"],
  },
]

const adminNavItem = {
  icon: ShieldCheck,
  label: "Admin",
  href: "/admin",
}

const helpNavItem = {
  icon: HelpCircle,
  label: "Ayuda",
  href: "/help",
}

interface SidebarProps {
  userName: string
  userEmail: string
  userAvatar: string | null
  userRole: string
  clinicName: string
  veviRegistered?: boolean
}

export function Sidebar({ userName, userEmail, userAvatar, userRole, clinicName, veviRegistered = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [helpDialogOpen, setHelpDialogOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const normalizedRole = userRole.toLowerCase()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()

    // Clear all user-specific caches
    if (typeof window !== 'undefined') {
      sessionStorage.clear()
      localStorage.clear()
    }

    await supabase.auth.signOut()

    // Force hard navigation to clear any cached state
    window.location.href = "/"
  }

  // Generate initials from userName (assumes format "FirstName LastName")
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Get theme icon based on current theme
  const getThemeIcon = () => {
    if (!mounted) return <Sun className="h-5 w-5 shrink-0" />
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5 shrink-0" />
      case "dark":
        return <Moon className="h-5 w-5 shrink-0" />
      default:
        return <Laptop className="h-5 w-5 shrink-0" />
    }
  }

  // Get theme label for display
  const getThemeLabel = () => {
    if (!mounted) return "Tema"
    switch (theme) {
      case "light":
        return "Claro"
      case "dark":
        return "Oscuro"
      default:
        return "Sistema"
    }
  }

  // Filter nav items by role
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(normalizedRole)
  )

  const visibleToolItems = toolItems.filter((item) =>
    item.roles.includes(normalizedRole)
  )

  return (
    <div
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header: Lab Name + Toggle Button */}
      <div className="flex h-14 items-center border-b border-border px-3">
        {!isCollapsed && (
          <span
            className="flex-1 truncate text-sm font-semibold text-foreground"
            title={clinicName}
          >
            {clinicName}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground", isCollapsed && "ml-auto")}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        <TooltipProvider delayDuration={200}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

            // "Acceso Vevi" is disabled for odontólogos until an admin registers
            // them in Vevi. Keep the item visible so users know it exists, but
            // render it non-interactive with a tooltip explaining why.
            const isDisabled =
              item.href === "/acceso-vevi" &&
              normalizedRole === "odontologo" &&
              !veviRegistered

            if (isDisabled) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                        "text-muted-foreground/50 cursor-not-allowed select-none",
                        isCollapsed && "justify-center",
                      )}
                      aria-disabled="true"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Pendiente de registro por el administrador</p>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
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
              </Link>
            )
          })}
        </TooltipProvider>

        {/* Divider — only show if there are tool items or admin */}
        {(visibleToolItems.length > 0 || normalizedRole === "administracion") && (
          <div className="my-4 border-t border-border" />
        )}

        {/* Tools Section */}
        {visibleToolItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.label}
              href={item.href}
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
            </Link>
          )
        })}

        {/* Admin Section - Only visible to administracion */}
        {normalizedRole === "administracion" && (
          <Link
            href={adminNavItem.href}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === adminNavItem.href || pathname.startsWith("/admin")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              isCollapsed && "justify-center",
            )}
            title={isCollapsed ? adminNavItem.label : undefined}
          >
            <adminNavItem.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>{adminNavItem.label}</span>}
          </Link>
        )}

        {/* Help Section */}
        <button
          onClick={() => setHelpDialogOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isCollapsed && "justify-center",
          )}
          title={isCollapsed ? helpNavItem.label : undefined}
        >
          <helpNavItem.icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>{helpNavItem.label}</span>}
        </button>
      </nav>

      {/* Theme Picker Section */}
      <TooltipProvider delayDuration={0}>
        <div className="border-t border-border px-2 py-2">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      isCollapsed && "justify-center",
                    )}
                  >
                    {getThemeIcon()}
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">Tema: {getThemeLabel()}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Cambiar tema</p>
                </TooltipContent>
              )}
            </Tooltip>
            <DropdownMenuContent side="right" align="end" className="w-40">
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light" className="cursor-pointer">
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Claro</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="cursor-pointer">
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Oscuro</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="cursor-pointer">
                  <Laptop className="mr-2 h-4 w-4" />
                  <span>Sistema</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>

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
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage
                  src={userAvatar || undefined}
                  alt={userName}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {userName}
                  </p>
                  <p className={cn(
                    "text-xs font-medium truncate leading-tight",
                    getRoleColor(userRole)
                  )}>
                    {getRoleDisplayName(userRole)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate leading-tight">
                    {userEmail}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Help Work-in-Progress Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Función no disponible</DialogTitle>
            <DialogDescription>
              La sección de Ayuda se encuentra en desarrollo. Estará disponible próximamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHelpDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
