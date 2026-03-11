import type { Transition, Variants } from 'framer-motion'

export const easeOutExpo = [0.22, 1, 0.36, 1] as const

export const softTransition: Transition = {
  duration: 0.72,
  ease: easeOutExpo,
}

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 140,
  damping: 18,
  mass: 0.9,
}

export const viewportOnce = {
  once: true,
  amount: 0.2,
}

export function staggerContainer(
  staggerChildren = 0.12,
  delayChildren = 0
): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren,
        delayChildren,
      },
    },
  }
}

export function fadeUp(distance = 26, duration = 0.72): Variants {
  return {
    hidden: {
      opacity: 0,
      y: distance,
      filter: 'blur(10px)',
    },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: easeOutExpo,
      },
    },
  }
}

export function fadeScale(scale = 0.96, duration = 0.72): Variants {
  return {
    hidden: {
      opacity: 0,
      scale,
      filter: 'blur(8px)',
    },
    show: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: easeOutExpo,
      },
    },
  }
}

export function slideReveal(x = 28, duration = 0.7): Variants {
  return {
    hidden: {
      opacity: 0,
      x,
      filter: 'blur(10px)',
    },
    show: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: easeOutExpo,
      },
    },
  }
}
