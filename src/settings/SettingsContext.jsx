/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { PageLoader } from '../component/States'
import { apiRequest } from '../utils/api'
import { configureCurrency } from '../utils/format'

const SettingsContext = createContext(null)
const FALLBACK = { currency: { code: 'USD', symbol: '$', locale: 'en-US', compact: false, name: 'US dollar' }, supported: [], cod: { enabled: true, maxAmount: null } }

// Prices can't be formatted until we know the store currency, so the app waits for this one small request.
// If the API is unreachable the shop still renders (in dollars) rather than staying blank.
export function SettingsProvider({ children }) {
  const [state, setState] = useState({ ready: false, settings: FALLBACK })

  useEffect(() => {
    let active = true
    apiRequest('/settings/public')
      .then((settings) => { configureCurrency(settings); if (active) setState({ ready: true, settings }) })
      .catch(() => { configureCurrency(FALLBACK); if (active) setState({ ready: true, settings: FALLBACK }) })
    return () => { active = false }
  }, [])

  const value = useMemo(() => state.settings, [state.settings])
  if (!state.ready) return <PageLoader />
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}
