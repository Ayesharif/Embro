/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, apiUrl, refreshSession, setAccessToken, setSessionLostHandler } from '../utils/api'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'

const AuthContext = createContext(null)
const ADMIN_ROLES = ['admin', 'super_admin']

export function AuthProvider({ children }) {
  // status: 'loading' while we ask the server whether the refresh cookie is still valid.
  const [state, setState] = useState({ status: 'loading', user: null })

  const signIn = useCallback(async ({ user, accessToken }) => {
    setAccessToken(accessToken)
    setState({ status: 'ready', user })
    await useCartStore.getState().merge()
    useWishlistStore.getState().load()
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // The cookie is cleared locally either way.
    }
    setAccessToken(null)
    setState({ status: 'ready', user: null })
    useCartStore.getState().reset()
    useWishlistStore.getState().reset()
    useCartStore.getState().load()
  }, [])

  const updateUser = useCallback((user) => setState((current) => ({ ...current, user })), [])

  useEffect(() => {
    setSessionLostHandler(() => {
      setState({ status: 'ready', user: null })
      useCartStore.getState().reset()
      useWishlistStore.getState().reset()
    })
    let active = true
    refreshSession()
      .then(({ user }) => {
        if (!active) return
        setState({ status: 'ready', user })
        useWishlistStore.getState().load()
      })
      .catch(() => active && setState({ status: 'ready', user: null }))
      .finally(() => useCartStore.getState().load())
    return () => { active = false }
  }, [])

  const value = useMemo(() => ({
    user: state.user,
    status: state.status,
    isAuthenticated: Boolean(state.user),
    isAdmin: ADMIN_ROLES.includes(state.user?.role),
    signIn,
    signOut,
    updateUser,
  }), [state, signIn, signOut, updateUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function googleSignInUrl() {
  return `${apiUrl}/auth/oauth/google/start`
}
