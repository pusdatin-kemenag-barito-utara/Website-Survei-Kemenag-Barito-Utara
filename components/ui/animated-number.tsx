'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  duration?: number
  className?: string
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1000,
  className = '',
}: AnimatedNumberProps) {
  const [current, setCurrent] = useState(0)
  const prevValueRef = useRef(0)

  useEffect(() => {
    // If target value is 0 (data still fetching), don't stay completely static if we want quick response
    const startValue = prevValueRef.current
    const endValue = value
    const startTime = performance.now()

    let animationFrameId: number

    const updateValue = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // EaseOutExpo easing function for smooth deceleration
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      const nextValue = startValue + (endValue - startValue) * easeOutExpo
      setCurrent(nextValue)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateValue)
      } else {
        prevValueRef.current = endValue
      }
    }

    animationFrameId = requestAnimationFrame(updateValue)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [value, duration])

  return (
    <span className={className}>
      {decimals > 0
        ? current.toFixed(decimals)
        : Math.round(current).toLocaleString('id-ID')}
    </span>
  )
}
