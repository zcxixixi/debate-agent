"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedBorderProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
}

export function AnimatedBorder({
  children,
  className,
  containerClassName,
}: AnimatedBorderProps) {
  const [position, setPosition] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev + 1) % 360)
    }, 20)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={cn("relative p-[1px] rounded-2xl overflow-hidden", containerClassName)}
      style={{
        background: `conic-gradient(from ${position}deg, transparent, #a855f7, #6366f1, transparent)`,
      }}
    >
      <div className={cn("relative bg-white rounded-2xl", className)}>
        {children}
      </div>
    </div>
  )
}