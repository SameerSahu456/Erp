import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Navigate back to the previous in-app page. If there is no in-app history
 * (user opened a deep link in a fresh tab), fall back to the provided route.
 *
 * React Router's history stores an `idx` on window.history.state that
 * increments with each in-app push. When idx > 0 it's safe to go back.
 */
export function useNavigateBack(fallback: string) {
  const navigate = useNavigate()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
    } else {
      navigate(fallback, { replace: true })
    }
  }, [navigate, fallback])
}
