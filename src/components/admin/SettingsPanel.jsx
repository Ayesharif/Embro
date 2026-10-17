import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Notice, Spinner } from '../../component/States'
import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { currencySymbol, money, shortDate, toCents } from '../../utils/format'
import { Loaded, PanelHeader } from './ui'

const ROUNDINGS = [['none', 'Exact (no rounding)'], ['1', 'Nearest 1'], ['10', 'Nearest 10'], ['50', 'Nearest 50'], ['100', 'Nearest 100']]

function CurrencyChange({ current, supported }) {
  const options = supported.filter((currency) => currency.code !== current.code)
  const [form, setForm] = useState({ to: options.find((currency) => currency.code === 'PKR')?.code || options[0]?.code || '', mode: 'convert', rate: '', rounding: '1', confirm: '' })
  const [preview, setPreview] = useState(null)
  const [state, setState] = useState({ busy: '', error: '' })
  const set = (key) => (event) => { setForm((existing) => ({ ...existing, [key]: event.target.value })); setPreview(null) }

  const target = supported.find((currency) => currency.code === form.to)
  const body = { to: form.to, mode: form.mode, ...(form.mode === 'convert' ? { rate: Number(form.rate), rounding: form.rounding } : {}) }
  const rateValid = form.mode === 'relabel' || Number(form.rate) > 0
  const previewMatches = preview && preview.key === JSON.stringify(body)
  const canApply = rateValid && form.confirm === form.to && (form.mode === 'relabel' || previewMatches)

  const liveRate = async () => {
    setState({ busy: 'rate', error: '' })
    try {
      const { rate } = await apiRequest(`/admin/settings/rate?from=${current.code}&to=${form.to}`)
      setForm((existing) => ({ ...existing, rate: String(Math.round(rate * 10000) / 10000) }))
      setPreview(null)
      setState({ busy: '', error: '' })
    } catch (error) {
      setState({ busy: '', error: error.message })
    }
  }
  const runPreview = async () => {
    setState({ busy: 'preview', error: '' })
    try {
      const result = await apiRequest('/admin/settings/currency/preview', { method: 'POST', body })
      setPreview({ ...result, key: JSON.stringify(body) })
      setState({ busy: '', error: '' })
    } catch (error) {
      setState({ busy: '', error: error.message })
    }
  }
  const apply = async (event) => {
    event.preventDefault()
    if (!window.confirm(`Switch the whole store to ${target.name} (${form.to})? This changes every price. Make sure you have a database backup.`)) return
    setState({ busy: 'apply', error: '' })
    try {
      const result = await apiRequest('/admin/settings/currency', { method: 'POST', body: { ...body, confirm: form.confirm } })
      toast.success(`Store is now in ${form.to}${form.mode === 'convert' ? ` - ${result.productsConverted} products converted` : ''}. Reloading...`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (error) {
      setState({ busy: '', error: error.message })
    }
  }

  return (
    <form onSubmit={apply} className="panel space-y-6 p-6">
      <div>
        <h2 className="text-lg font-bold">Change store currency</h2>
        <p className="mt-1 text-sm text-white/65">Prices, checkout, invoices, emails and reports will all use the new currency.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">New currency
          <select value={form.to} onChange={set('to')} className="input">{options.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} - {currency.name} ({currency.symbol})</option>)}</select>
        </label>
        <fieldset className="space-y-2">
          <legend className="label">What should happen to existing prices?</legend>
          {[['convert', 'Convert them using an exchange rate'], ['relabel', 'Keep the numbers, just change the currency']].map(([value, text]) => (
            <label key={value} className="flex items-start gap-2 text-sm"><input type="radio" name="mode" className="mt-1" checked={form.mode === value} onChange={() => { setForm((existing) => ({ ...existing, mode: value })); setPreview(null) }} />{text}</label>
          ))}
        </fieldset>
      </div>

      {form.mode === 'convert' && (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="label">Exchange rate: 1 {current.code} = ? {form.to}
            <input required type="number" min="0.0001" step="any" value={form.rate} onChange={set('rate')} placeholder="e.g. 280" className="input" />
          </label>
          <button type="button" onClick={liveRate} disabled={state.busy === 'rate'} className="btn btn-outline">{state.busy === 'rate' ? <Spinner className="h-4 w-4" /> : <RefreshCw size={15} />} Get live rate</button>
          <label className="label">Round selling prices to
            <select value={form.rounding} onChange={set('rounding')} className="input">{ROUNDINGS.map(([value, label]) => <option key={value} value={value}>{label}{value !== 'none' && target ? ` ${target.symbol}` : ''}</option>)}</select>
          </label>
        </div>
      )}
      {form.mode === 'convert' && <p className="-mt-3 text-xs text-white/50">The live rate is a suggestion from a public exchange-rate service - check it before applying. Purchasing costs are converted exactly; only selling prices, shipping and discounts are rounded.</p>}

      {form.mode === 'convert' && (
        <div>
          <button type="button" onClick={runPreview} disabled={!rateValid || state.busy === 'preview'} className="btn btn-outline">{state.busy === 'preview' ? <Spinner className="h-4 w-4" /> : 'Preview conversion'}</button>
          {previewMatches && (
            <div className="fade-in mt-4 space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 text-sm">
              <p>This will convert <strong>{preview.counts.products}</strong> products (<strong>{preview.counts.variants}</strong> variants), <strong>{preview.counts.shippingMethods}</strong> shipping methods and <strong>{preview.counts.discounts}</strong> discount codes{preview.codMax && ', and the cash-on-delivery limit'}.</p>
              <table className="w-full text-left">
                <thead className="text-xs uppercase tracking-wider text-white/50"><tr><th className="py-1">Item</th><th>Now</th><th /><th>After</th></tr></thead>
                <tbody className="divide-y divide-white/10">
                  {[...preview.samples.map((row) => ({ ...row, name: `${row.name} (${row.variant})` })), ...preview.shipping.map((row) => ({ ...row, name: `Shipping: ${row.name}` }))].map((row) => (
                    <tr key={row.name}><td className="py-1.5 pr-3">{row.name}</td><td>{money(row.before, preview.from.code)}</td><td className="px-2 text-white/40"><ArrowRight size={14} /></td><td className="font-semibold">{money(row.after, preview.to.code)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Before you switch</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/90">
          <li>Back up your database first. This rewrites every price in the shop.</li>
          <li>Past orders keep the currency they were placed in. Accounts and the dashboard only add up orders in the current currency.</li>
          <li>Online card payments are charged in the new currency, so your Stripe account must support it. Cash on delivery works in any currency.</li>
          <li>Customers who are mid-checkout will be asked to review their order again.</li>
        </ul>
      </div>

      <label className="label sm:max-w-xs">Type <strong>{form.to}</strong> to confirm
        <input value={form.confirm} onChange={(event) => setForm((existing) => ({ ...existing, confirm: event.target.value.toUpperCase() }))} autoComplete="off" placeholder={form.to} className="input" />
      </label>
      <Notice>{state.error}</Notice>
      <button type="submit" disabled={!canApply || state.busy === 'apply'} className="btn btn-primary">{state.busy === 'apply' ? <Spinner className="h-4 w-4" /> : `Switch store to ${form.to}`}</button>
      {form.mode === 'convert' && !previewMatches && form.confirm === form.to && <p className="text-xs text-white/55">Run the preview first so you can see what will change.</p>}
    </form>
  )
}

function CodSettings({ cod, reload }) {
  const [form, setForm] = useState({ enabled: cod.enabled, max: cod.maxAmount ? (cod.maxAmount / 100).toString() : '' })
  const [saving, setSaving] = useState(false)
  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await apiRequest('/admin/settings/cod', { method: 'PATCH', body: { enabled: form.enabled, maxAmount: form.max ? toCents(form.max) : 0 } })
      toast.success('Cash on delivery settings saved')
      reload()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={save} className="panel space-y-4 p-6">
      <h2 className="text-lg font-bold">Cash on delivery</h2>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Offer cash on delivery at checkout</label>
      <label className="label sm:max-w-xs">Largest order accepted ({currencySymbol()})
        <input type="number" min="0" step="0.01" value={form.max} onChange={(event) => setForm({ ...form, max: event.target.value })} placeholder="Leave empty for no limit" className="input" />
      </label>
      <button type="submit" disabled={saving} className="btn btn-primary">{saving ? <Spinner className="h-4 w-4" /> : 'Save'}</button>
    </form>
  )
}

export default function SettingsPanel() {
  const result = useFetch('/admin/settings')
  return (
    <>
      <PanelHeader title="Settings" />
      <Loaded result={result}>
        {({ currency, supported, cod, history }) => (
          <div className="max-w-3xl space-y-6">
            <div className="panel flex items-center justify-between gap-4 p-6">
              <div><p className="text-sm text-white/60">Store currency</p><p className="mt-1 text-2xl font-bold">{currency.code} <span className="text-lg font-normal text-white/60">· {currency.name} ({currency.symbol})</span></p></div>
              <p className="hidden text-sm text-white/50 sm:block">e.g. {money(1234500, currency.code)}</p>
            </div>
            <CurrencyChange current={currency} supported={supported} />
            <CodSettings cod={cod} reload={result.reload} />
            {history.length > 0 && (
              <section>
                <h2 className="mb-3 font-bold">Currency history</h2>
                <div className="panel divide-y divide-white/10 text-sm">
                  {history.map((entry) => (
                    <p key={entry._id || entry.at} className="px-4 py-3">{shortDate(entry.at)} · {entry.from} → <strong>{entry.to}</strong> · {entry.mode === 'convert' ? `converted at ${entry.rate} (${entry.productsConverted} products)` : 'relabelled only'}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Loaded>
    </>
  )
}
