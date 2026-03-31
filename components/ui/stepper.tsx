import * as React from "react"
import { cn } from "@/lib/utils"

interface StepperProps {
  totalSteps: number
  currentStep: number
  className?: string
}

function Stepper({ totalSteps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep

        return (
          <div
            key={index}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all duration-300 ease-in-out",
              isActive || isCompleted ? "bg-primary" : "bg-muted-foreground/30"
            )}
            aria-label={`Paso ${stepNumber} de ${totalSteps}`}
            aria-current={isActive ? "step" : undefined}
          />
        )
      })}
    </div>
  )
}

export { Stepper, type StepperProps }
