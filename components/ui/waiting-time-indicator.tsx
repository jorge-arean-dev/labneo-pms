"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface WaitingTimeIndicatorProps {
  arrivedAt: string // ISO timestamp
  className?: string
  showIcon?: boolean
  prefix?: string // Text to show between icon and time (e.g., "En espera hace")
}

export function WaitingTimeIndicator({ arrivedAt, className, showIcon = true, prefix }: WaitingTimeIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState("")

  useEffect(() => {
    const calculateElapsed = () => {
      const now = new Date()
      const arrived = new Date(arrivedAt)
      const diffMs = now.getTime() - arrived.getTime()
      // Use Math.max(0, ...) to handle minor clock skew between server and client
      const diffMins = Math.max(0, Math.floor(diffMs / 60000))

      if (diffMins < 60) {
        return `${diffMins} min`
      } else {
        const hours = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        return `${hours}h ${mins}min`
      }
    }

    // Initial calculation
    setElapsedTime(calculateElapsed())

    // Update every minute
    const interval = setInterval(() => {
      setElapsedTime(calculateElapsed())
    }, 60000)

    return () => clearInterval(interval)
  }, [arrivedAt])

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300", className)}>
      {showIcon && <Clock className="h-3.5 w-3.5 animate-pulse" />}
      {prefix && <span>{prefix}</span>}
      <span className="font-medium tabular-nums">{elapsedTime}</span>
    </span>
  )
}
