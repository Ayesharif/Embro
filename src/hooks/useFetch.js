import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Loads `path` and re-loads when it changes. `loading` is derived (not set inside the effect),
// so switching pages never flashes stale data from the previous request.
export function useFetch(path) {
  const [state, setState] = useState({ path: null, data: null, error: null })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    const controller = new AbortController()
    apiRequest(path, { signal: controller.signal })
      .then((data) => setState({ path, data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ path, data: null, error })
      })
    return () => controller.abort()
  }, [path, nonce])

  const settled = state.path === path
  const reload = useCallback(() => setNonce((value) => value + 1), [])
  return {
    data: settled ? state.data : null,
    error: settled ? state.error : null,
    loading: Boolean(path) && !settled,
    reload,
  }
}
