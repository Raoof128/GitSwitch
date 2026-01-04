import { useEffect, useState } from 'react'
import type { Variants } from 'framer-motion'
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

export const fadeSlideIn = (reduceMotion: boolean): Variants => ({
  hidden: {
    opacity: 0,
    y: reduceMotion ? 0 : 6
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.12
    }
  },
  exit: {
    opacity: 0,
    y: reduceMotion ? 0 : 6,
    transition: {
      duration: 0.1
    }
  }
})

export const listItem = (reduceMotion: boolean): Variants => ({
  hidden: {
    opacity: 0,
    y: reduceMotion ? 0 : 4
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: reduceMotion ? 0 : 4,
    transition: {
      duration: 0.08
    }
  }
})

export const scaleTap = (reduceMotion: boolean) =>
  reduceMotion ? undefined : { scale: 0.98, transition: { duration: 0.08 } }
