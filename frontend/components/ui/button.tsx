import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.985] hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#141414_0%,#252a33_55%,#1d4ed8_100%)] text-white shadow-[0_18px_40px_rgba(29,78,216,0.18)] hover:shadow-[0_24px_50px_rgba(29,78,216,0.24)]",
        destructive:
          "bg-[linear-gradient(135deg,#ef4444_0%,#ff453a_100%)] text-white shadow-[0_18px_40px_rgba(255,69,58,0.2)]",
        outline:
          "border border-black/10 bg-white/75 text-primary backdrop-blur-md hover:bg-white hover:border-black/15 hover:shadow-soft-md",
        secondary:
          "bg-black/[0.04] text-primary hover:bg-black/[0.08] hover:shadow-soft",
        ghost:
          "hover:bg-black/[0.04]",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_100%)] text-white shadow-soft-md hover:shadow-soft-lg",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
