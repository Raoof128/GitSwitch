import { useEffect, useState } from 'react'
import type { Variants, TargetAndTransition } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'

export function useReducedMotionSafe(forceReduced?: boolean): boolean {
  const motionPreference = useReducedMotion()
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (): void => setFallback(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return Boolean(forceReduced || motionPreference || fallback)
}

// Brutalist: hard scale pulse instead of soft fades
export const fadeSlideIn = (reduceMotion: boolean): Variants => ({
  hidden: {
    opacity: 0,
    scale: reduceMotion ? 1 : 1.02
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.05
    }
  },
  exit: {
    opacity: 0,
    scale: reduceMotion ? 1 : 0.98,
    transition: {
      duration: 0.04
    }
  }
})

// Stagger items in with a hard cut feel
export const listItem = (reduceMotion: boolean): Variants => ({
  hidden: {
    opacity: 0,
    x: reduceMotion ? 0 : -4
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.06
    }
  },
  exit: {
    opacity: 0,
    x: reduceMotion ? 0 : 4,
    transition: {
      duration: 0.04
    }
  }
})

export const scaleTap = (reduceMotion: boolean): TargetAndTransition | undefined =>
  reduceMotion ? undefined : { scale: 0.96, transition: { duration: 0.04 } }

// Slide panel animation
export const slidePanel = (reduceMotion: boolean): Variants => ({
  hidden: {
    x: reduceMotion ? 0 : '100%',
    opacity: reduceMotion ? 0 : 1
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 400,
      duration: 0.2
    }
  },
  exit: {
    x: reduceMotion ? 0 : '100%',
    opacity: reduceMotion ? 0 : 1,
    transition: {
      duration: 0.15
    }
  }
})

// Backdrop fade
export const backdropFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.08 } }
}
