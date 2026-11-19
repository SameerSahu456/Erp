import { useCallback, useState } from "react"

type ErrorMap = Record<string, string>

interface UseFormErrorsResult {
  errors: ErrorMap
  setErrors: (errs: ErrorMap) => void
  setError: (field: string, message: string) => void
  clearError: (field: string) => void
  clearAll: () => void
  hasErrors: boolean
}

function useFormErrors(): UseFormErrorsResult {
  const [errors, setErrorsState] = useState<ErrorMap>({})

  const setErrors = useCallback((errs: ErrorMap) => {
    setErrorsState(errs)
  }, [])

  const setError = useCallback((field: string, message: string) => {
    setErrorsState((prev) => ({ ...prev, [field]: message }))
  }, [])

  const clearError = useCallback((field: string) => {
    setErrorsState((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setErrorsState({})
  }, [])

  return {
    errors,
    setErrors,
    setError,
    clearError,
    clearAll,
    hasErrors: Object.keys(errors).length > 0,
  }
}

export { useFormErrors, type UseFormErrorsResult }
