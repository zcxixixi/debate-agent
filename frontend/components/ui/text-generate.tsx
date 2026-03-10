"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TextGenerateEffectProps {
  words: string
  className?: string
}

export function TextGenerateEffect({
  words,
  className,
}: TextGenerateEffectProps) {
  const [displayedText, setDisplayedText] = React.useState("")
  const [currentIndex, setCurrentIndex] = React.useState(0)

  React.useEffect(() => {
    if (currentIndex < words.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(words.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, 30)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, words])

  return (
    <span className={cn("", className)}>
      {displayedText}
      {currentIndex < words.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  )
}