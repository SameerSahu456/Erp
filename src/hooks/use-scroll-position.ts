import { useState, useEffect } from 'react'

export function useScrollPosition() {
  const [isPastThreshold, setIsPastThreshold] = useState(false)

  useEffect(() => {
    const target = window.innerHeight

    const sentinel = document.createElement('div')
    sentinel.style.position = 'absolute'
    sentinel.style.top = `${target}px`
    sentinel.style.height = '1px'
    sentinel.style.width = '1px'
    sentinel.style.pointerEvents = 'none'
    document.body.appendChild(sentinel)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsPastThreshold(!entry.isIntersecting)
        }
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      sentinel.remove()
    }
  }, [])

  return isPastThreshold
}
