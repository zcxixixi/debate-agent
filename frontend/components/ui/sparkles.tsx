"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SparklesCoreProps {
  id?: string
  background?: string
  minSize?: number
  maxSize?: number
  particleDensity?: number
  className?: string
  particleColor?: string
}

export function SparklesCore({
  id,
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 50,
  className,
  particleColor = "#FFF",
}: SparklesCoreProps) {
  const [particles, setParticles] = React.useState<Array<{
    id: number
    x: number
    y: number
    size: number
    opacity: number
    delay: number
  }>>([])

  React.useEffect(() => {
    const newParticles = Array.from({ length: particleDensity }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      opacity: Math.random() * 0.5 + 0.3,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [particleDensity, minSize, maxSize])

  return (
    <div
      id={id}
      className={cn("relative overflow-hidden", className)}
      style={{ background }}
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particleColor,
            opacity: particle.opacity,
            animationDelay: `${particle.delay}s`,
            animationDuration: "2s",
          }}
        />
      ))}
    </div>
  )
}