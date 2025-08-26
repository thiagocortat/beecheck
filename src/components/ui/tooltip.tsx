"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
}

interface TooltipTriggerProps {
  children: React.ReactNode
  className?: string
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
}

const TooltipProvider = ({ children }: TooltipProps) => {
  return <>{children}</>
}

const Tooltip = ({ children }: TooltipProps) => {
  return (
    <div className="relative inline-block group">
      {children}
    </div>
  )
}

const TooltipTrigger = ({ children, className }: TooltipTriggerProps) => {
  return (
    <div className={cn("cursor-help", className)}>
      {children}
    </div>
  )
}

const TooltipContent = ({ children, className }: TooltipContentProps) => {
  return (
    <div
      className={cn(
        "absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-md shadow-lg",
        "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
        "transition-all duration-200 ease-in-out",
        "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
        "before:content-[''] before:absolute before:top-full before:left-1/2",
        "before:transform before:-translate-x-1/2 before:border-4",
        "before:border-transparent before:border-t-gray-900",
        "whitespace-normal break-words",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }