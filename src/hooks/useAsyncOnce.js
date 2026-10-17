import { useEffect, useState } from 'react'

const cache = new Map()

// Runs `task` once per key for the lifetime of the page and shares the outcome with every
// caller. Needed for one-time links (email verification, OAuth codes) that must not be
// submitted twice when React StrictMode mounts a component twice in development.
export function useAsyncOnce(key, task) {
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    if (!key) return undefined
    let active = true
    if (!cache.has(key)) cache.set(key, task().then((data) => ({ data, error: null }), (error) => ({ data: null, error })))
    cache.get(key).then((outcome) => active && setResult({ key, ...outcome }))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { pending: Boolean(key) && result.key !== key, data: result.data, error: result.error }
}
