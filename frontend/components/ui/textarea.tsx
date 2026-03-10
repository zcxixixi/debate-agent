import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full rounded-2xl border border-black/[0.06] bg-white px-5 py-4",
          "text-base text-primary placeholder:text-tertiary",
          "transition-all duration-200 ease-smooth",
          "hover:border-black/[0.1]",
          "focus:outline-none focus:border-black/20 focus:ring-4 focus:ring-black/[0.03]",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }