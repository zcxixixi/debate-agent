import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'card' | 'debate-card'
}

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-black/[0.04] rounded'

  const variantClasses = {
    text: 'h-4 w-full',
    card: 'h-32 w-full rounded-xl',
    'debate-card': 'h-48 w-full rounded-xl',
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{
        background:
          'linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  )
}
