// Money is stored as integer minor units (cents/paisa). The store currency comes from the API
// (Admin -> Settings), so the same code formats dollars today and rupees tomorrow.
let storeCurrency = { code: 'USD', symbol: '$', locale: 'en-US', compact: false }
const known = new Map()
const formatters = new Map()

export function configureCurrency({ currency, supported = [] }) {
  storeCurrency = currency
  known.clear()
  formatters.clear()
  supported.forEach((info) => known.set(info.code, info))
  known.set(currency.code, currency)
}

export function currentCurrency() {
  return storeCurrency
}

export function currencySymbol(code) {
  return code ? known.get(code.toUpperCase())?.symbol || code.toUpperCase() : storeCurrency.symbol
}

// `code` lets old orders show in the currency they were placed in after the store switches currency.
export function money(cents, code) {
  const info = (code && known.get(code.toUpperCase())) || (code ? { code: code.toUpperCase(), locale: 'en-US', compact: false } : storeCurrency)
  const whole = info.compact && (cents || 0) % 100 === 0
  const key = `${info.code}:${whole}`
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat(info.locale, { style: 'currency', currency: info.code, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }))
  }
  return formatters.get(key).format((cents || 0) / 100)
}

export function toCents(amount) {
  return Math.round(Number(amount) * 100)
}

export function shortDate(value) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''
}

export function titleCase(value = '') {
  return value.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}
