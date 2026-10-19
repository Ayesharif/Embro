import { AlertTriangle, Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { money } from '../../utils/format'
import { Loaded, PanelHeader, Table } from './ui'

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
const pad = (value) => String(value).padStart(2, '0')
const dayString = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const daysAgo = (count) => { const date = new Date(); date.setDate(date.getDate() - count); return dayString(date) }

const PRESETS = [
  { id: 'today', label: 'Today', range: () => [dayString(new Date()), dayString(new Date())] },
  { id: '7d', label: '7 days', range: () => [daysAgo(6), dayString(new Date())] },
  { id: '30d', label: '30 days', range: () => [daysAgo(29), dayString(new Date())] },
  { id: 'month', label: 'This month', range: () => { const now = new Date(); return [dayString(new Date(now.getFullYear(), now.getMonth(), 1)), dayString(now)] } },
  { id: 'year', label: 'This year', range: () => [`${new Date().getFullYear()}-01-01`, dayString(new Date())] },
  { id: 'all', label: 'All time', range: () => ['2020-01-01', dayString(new Date())] },
]

function Stat({ label, value, sub, tone }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className={`mt-1 text-2xl font-bold sm:text-3xl ${tone || ''}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-white/50">{sub}</p>}
    </div>
  )
}

// Dependency-free grouped bar chart: revenue next to profit for each day (or month).
function Chart({ series }) {
  const width = 800
  const height = 260
  const pad = { top: 16, right: 12, bottom: 28, left: 56 }
  const values = series.flatMap((point) => [point.revenue, point.profit, 0])
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const y = (value) => pad.top + ((max - value) / (max - min || 1)) * (height - pad.top - pad.bottom)
  const slot = (width - pad.left - pad.right) / Math.max(series.length, 1)
  const barWidth = Math.max(2, Math.min(18, slot / 2.6))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => min + (max - min) * fraction)
  const labelEvery = Math.ceil(series.length / 8)

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Revenue and profit over time" className="w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(255,255,255,0.1)" />
            <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.55)">{money(Math.round(tick)).replace('.00', '')}</text>
          </g>
        ))}
        {series.map((point, index) => {
          const x = pad.left + slot * index + slot / 2
          return (
            <g key={point.date}>
              <rect x={x - barWidth} y={Math.min(y(point.revenue), y(0))} width={barWidth - 1} height={Math.abs(y(point.revenue) - y(0))} rx="2" fill="#94a3b8"><title>{`${point.date}: revenue ${money(point.revenue)} (${point.orders} orders)`}</title></rect>
              <rect x={x + 1} y={Math.min(y(point.profit), y(0))} width={barWidth - 1} height={Math.abs(y(point.profit) - y(0))} rx="2" fill={point.profit >= 0 ? '#34d399' : '#f87171'}><title>{`${point.date}: profit ${money(point.profit)}`}</title></rect>
              {index % labelEvery === 0 && <text x={x} y={height - 8} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.55)">{point.date.slice(5)}</text>}
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 flex gap-5 text-xs text-white/60"><span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" />Revenue</span><span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />Profit</span></figcaption>
    </figure>
  )
}

function exportCsv(report, from, to) {
  const { totals, cash, series, inventory } = report
  const dollars = (cents) => (cents / 100).toFixed(2)
  const rows = [
    ['Lembro accounts report', `${from} to ${to}`], [],
    ['Orders', totals.orders], ['Items sold', totals.itemsSold], ['Gross sales', dollars(totals.grossSales)], ['Discounts', dollars(totals.discounts)],
    ['Shipping charged', dollars(totals.shipping)], ['Net revenue (excl. tax)', dollars(totals.netRevenue)], ['Cost of goods', dollars(totals.cogs)],
    ['Profit', dollars(totals.profit)], ['Profit margin %', (totals.margin * 100).toFixed(1)], ['Tax collected', dollars(totals.tax)], ['Refunds', dollars(totals.refunds)],
    ['Cash received', dollars(cash.received)], ['COD still to collect', dollars(cash.outstandingCod)], ['Stock at cost', dollars(inventory.atCost)], [],
    ['Date', 'Revenue', 'Profit', 'Orders'], ...series.map((point) => [point.date, dollars(point.revenue), dollars(point.profit), point.orders]),
  ]
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  link.download = `accounts-${from}-to-${to}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function Row({ label, value, strong, negative, muted }) {
  return (
    <div className={`flex justify-between px-4 py-3 text-sm ${strong ? 'bg-white/5 font-bold' : ''} ${muted ? 'text-white/60' : ''}`}>
      <span>{label}</span><span className={negative ? 'text-red-300' : ''}>{negative && value ? '−' : ''}{money(Math.abs(value))}</span>
    </div>
  )
}

export default function AccountsPanel() {
  const [preset, setPreset] = useState('30d')
  const [custom, setCustom] = useState(null)
  const [from, to] = custom || PRESETS.find((item) => item.id === preset).range()

  // Local midnight to local end-of-day, so "today" means today where the admin is.
  const query = useMemo(() => new URLSearchParams({
    from: new Date(`${from}T00:00:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
    tz: timeZone,
  }).toString(), [from, to])
  const result = useFetch(`/admin/accounts?${query}`)

  return (
    <>
      <PanelHeader title="Accounts" action={result.data && <button type="button" onClick={() => exportCsv(result.data, from, to)} className="btn btn-outline btn-sm"><Download size={15} /> Export CSV</button>} />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range">
          {PRESETS.map((item) => (
            <button key={item.id} type="button" aria-pressed={!custom && preset === item.id} onClick={() => { setPreset(item.id); setCustom(null) }} className={`rounded-lg px-3 py-2 text-sm transition ${!custom && preset === item.id ? 'bg-white font-semibold text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}>{item.label}</button>
          ))}
        </div>
        <label className="label">From<input type="date" max={to} value={from} onChange={(event) => event.target.value && setCustom([event.target.value, to])} className="input w-40" /></label>
        <label className="label">To<input type="date" min={from} value={to} onChange={(event) => event.target.value && setCustom([from, event.target.value])} className="input w-40" /></label>
      </div>

      <Loaded result={result}>
        {({ totals, cash, byMethod, series, topProducts, inventory, itemsMissingCost, truncated, otherCurrencyOrders }) => {
          const revenueBeforeRefunds = totals.grossSales - totals.discounts + totals.shipping
          return (
            <div className="space-y-8">
              {itemsMissingCost > 0 && <p className="flex items-start gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{itemsMissingCost} item(s) in this period were sold before purchasing costs were recorded, so their cost counts as zero and profit is overstated.</p>}
              {otherCurrencyOrders > 0 && <p className="rounded-lg border border-sky-300/30 bg-sky-500/10 p-4 text-sm text-sky-100">{otherCurrencyOrders} order(s) in this period were placed in a different currency and are not included in these figures.</p>}
              {truncated && <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">This range has a very large number of orders and was truncated. Narrow the dates for exact figures.</p>}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Net revenue" value={money(totals.netRevenue)} sub={`${totals.orders} order${totals.orders === 1 ? '' : 's'} · avg ${money(totals.averageOrderValue)}`} />
                <Stat label="Profit" value={money(totals.profit)} tone={totals.profit < 0 ? 'text-red-300' : 'text-emerald-300'} sub={`${(totals.margin * 100).toFixed(1)}% margin`} />
                <Stat label="Tax collected" value={money(totals.tax)} sub="Owed to the tax authority" />
                <Stat label="Refunds" value={money(totals.refunds)} sub={`${totals.refundedOrders} order${totals.refundedOrders === 1 ? '' : 's'}`} />
                <Stat label="Cash received" value={money(cash.received)} sub="Paid online + collected COD" />
                <Stat label="COD to collect" value={money(cash.outstandingCod)} tone={cash.outstandingCod ? 'text-amber-200' : ''} sub={`${cash.outstandingCodOrders} unpaid order${cash.outstandingCodOrders === 1 ? '' : 's'}`} />
                <Stat label="Items sold" value={totals.itemsSold} />
                <Stat label="Stock value (at cost)" value={money(inventory.atCost)} sub={`${inventory.units} units · ${money(inventory.atRetail)} at retail`} />
              </div>

              <section className="panel p-5">
                <h2 className="mb-4 font-bold">Revenue and profit</h2>
                {series.length ? <Chart series={series} /> : <p className="text-sm text-white/60">No sales in this period.</p>}
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <h2 className="mb-3 font-bold">Profit &amp; loss</h2>
                  <div className="panel divide-y divide-white/10">
                    <Row label="Gross sales (items)" value={totals.grossSales} />
                    <Row label="Discounts" value={totals.discounts} negative />
                    <Row label="Shipping charged" value={totals.shipping} />
                    <Row label="Refunds (revenue share)" value={revenueBeforeRefunds - totals.netRevenue} negative />
                    <Row label="Net revenue (excl. tax)" value={totals.netRevenue} strong />
                    <Row label="Cost of goods sold" value={totals.cogs} negative />
                    <Row label="Profit" value={totals.profit} strong />
                    <Row label="Tax collected (not income)" value={totals.tax} muted />
                    <Row label="Total billed to customers (net of refunds)" value={totals.billed} muted />
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 font-bold">Sales by payment method</h2>
                  <div className="panel divide-y divide-white/10">
                    {[['Online (card)', byMethod.online], ['Cash on delivery', byMethod.cod]].map(([label, row]) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3 text-sm"><span>{label}<span className="ml-2 text-xs text-white/50">{row.orders} order{row.orders === 1 ? '' : 's'}</span></span><strong>{money(row.revenue)}</strong></div>
                    ))}
                  </div>
                  <h2 className="mb-3 mt-6 font-bold">Stock on hand</h2>
                  <div className="panel divide-y divide-white/10">
                    <Row label="At purchasing cost" value={inventory.atCost} />
                    <Row label="At selling price" value={inventory.atRetail} />
                    <Row label="Potential profit" value={inventory.atRetail - inventory.atCost} strong />
                  </div>
                </section>
              </div>

              <section>
                <h2 className="mb-3 font-bold">Top products by profit</h2>
                <Table rows={topProducts} empty="No sales in this period." columns={[
                  { header: 'Product', render: (product) => <strong>{product.name}</strong> },
                  { header: 'Units', render: (product) => product.units },
                  { header: 'Revenue', render: (product) => money(product.revenue) },
                  { header: 'Profit', render: (product) => <span className={product.profit < 0 ? 'text-red-300' : 'text-emerald-300'}>{money(product.profit)}</span> },
                ]} />
              </section>

              <p className="text-xs leading-5 text-white/45">
                How this is calculated: cancelled orders are ignored; other orders count when placed. Revenue excludes tax and is reduced by the refunded share. Cost of goods uses the purchasing cost saved on each item when it was sold (fully refunded orders are assumed returned to stock). Profit does not include your overheads, courier costs or payment-processor fees. Dates use your local time zone ({timeZone}).
              </p>
            </div>
          )
        }}
      </Loaded>
    </>
  )
}
