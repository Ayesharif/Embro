import { AlertTriangle, FileText } from 'lucide-react'
import { useState } from 'react'
import { Notice } from '../../component/States'
import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { currencySymbol, money as formatMoney, shortDate, titleCase } from '../../utils/format'
import { deliveryInfo, paymentInfo } from '../../utils/orderStatus'
import Invoice from './Invoice'
import { Loaded, Modal, PanelHeader, Table } from './ui'

const RANK = { pending: 0, paid: 1, processing: 2, shipped: 3, delivered: 4 }
const Badge = ({ tone, children }) => <span className={`badge ${tone}`}>{children}</span>

// Only offer moves the API will accept: forward in the fulfilment flow, plus cancelling unpaid COD orders.
function nextStatuses(order) {
  if (RANK[order.status] === undefined) return []
  const forward = ['processing', 'shipped', 'delivered'].filter((status) => RANK[status] > RANK[order.status])
  const cancellable = order.paymentMethod === 'cod' && order.paymentStatus === 'pending' && RANK[order.status] < RANK.shipped
  return cancellable ? [...forward, 'cancelled'] : forward
}

function OrderDetail({ id, onClose, onChanged }) {
  const result = useFetch(`/admin/orders/${id}`)
  const [shipment, setShipment] = useState({ carrier: '', trackingNumber: '' })
  const [refund, setRefund] = useState({ amount: '', reason: '', restock: false })
  const [error, setError] = useState('')
  const [invoiceOpen, setInvoiceOpen] = useState(false)

  const act = async (request, message) => {
    setError('')
    try {
      await request()
      toast.success(message)
      result.reload()
      onChanged()
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    }
  }

  return (
    <Modal title="Order details" onClose={onClose} wide>
      <Loaded result={result}>
        {({ order, shipments, refunds }) => {
          const money = (amount) => formatMoney(amount, order.currency)
          const remaining = order.totalAmount - order.refundedAmount
          const payment = paymentInfo(order)
          const delivery = deliveryInfo(order)
          const options = nextStatuses(order)
          return (
            <div className="space-y-6 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-lg font-bold">{order.number}</p><p className="text-white/60">{shortDate(order.createdAt)} · {order.user?.name} ({order.user?.email})</p></div>
                <button type="button" onClick={() => setInvoiceOpen(true)} className="btn btn-primary btn-sm"><FileText size={15} /> Print invoice</button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white/5 p-4"><p className="text-xs uppercase tracking-wider text-white/50">Payment</p><p className="mt-1"><Badge tone={payment.tone}>{payment.label}</Badge></p><p className="mt-2 text-white/70">{payment.method}</p></div>
                <div className="rounded-lg bg-white/5 p-4"><p className="text-xs uppercase tracking-wider text-white/50">Delivery</p><p className="mt-1"><Badge tone={delivery.tone}>{delivery.label}</Badge></p><p className="mt-2 text-white/70">{titleCase(order.status)}</p></div>
              </div>

              {order.requiresAttention && <p className="flex items-start gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-amber-100"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{order.notes || 'This order needs attention.'}</p>}
              <ul className="divide-y divide-white/10">{order.items.map((item) => <li key={item.id} className="flex justify-between py-2"><span>{item.productNameSnapshot}{item.variantLabel && ` (${item.variantLabel})`} × {item.quantity}</span><span>{money(item.lineTotalAmount)}</span></li>)}</ul>
              <p className="flex justify-between border-t border-white/15 pt-3 text-base font-bold"><span>Total</span><span>{money(order.totalAmount)}</span></p>
              {order.refundedAmount > 0 && <p className="text-amber-200">Refunded so far: {money(order.refundedAmount)}</p>}
              {order.addressSnapshot && <p className="rounded-lg bg-white/5 p-3"><strong>Ship to:</strong> {order.addressSnapshot.name}, {order.addressSnapshot.line1}{order.addressSnapshot.line2 && `, ${order.addressSnapshot.line2}`}, {order.addressSnapshot.city} {order.addressSnapshot.postalCode}, {order.addressSnapshot.country}{order.addressSnapshot.phone && ` · ${order.addressSnapshot.phone}`}</p>}

              {options.length > 0 && (
                <label className="label sm:max-w-xs">Update order status
                  <select value="" onChange={(event) => event.target.value && act(() => apiRequest(`/admin/orders/${id}`, { method: 'PATCH', body: { status: event.target.value } }), 'Status updated')} className="input">
                    <option value="">Currently: {titleCase(order.status)}</option>
                    {options.map((status) => <option key={status} value={status}>{status === 'cancelled' ? 'Cancel order (return stock)' : `Mark ${status}`}</option>)}
                  </select>
                  {order.paymentMethod === 'cod' && <span className="mt-1 block text-xs font-normal text-white/50">Marking a cash-on-delivery order delivered also records the cash as received.</span>}
                </label>
              )}

              {shipments.map((item) => <p key={item.id} className="rounded-lg bg-white/5 p-3"><strong>{item.carrier}</strong> · {item.trackingNumber} · {titleCase(item.status)}{item.status !== 'delivered' && <button type="button" onClick={() => act(() => apiRequest(`/admin/shipments/${item.id}`, { method: 'PATCH', body: { status: 'delivered' } }), 'Marked delivered')} className="btn btn-outline btn-sm ml-3">Mark delivered</button>}</p>)}

              {['pending', 'paid', 'processing', 'shipped'].includes(order.status) && (
                <form onSubmit={async (event) => { event.preventDefault(); if (await act(() => apiRequest(`/admin/orders/${id}/shipments`, { method: 'POST', body: shipment }), 'Shipment added')) setShipment({ carrier: '', trackingNumber: '' }) }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input required aria-label="Carrier" placeholder="Carrier" value={shipment.carrier} onChange={(event) => setShipment({ ...shipment, carrier: event.target.value })} className="input" />
                  <input required aria-label="Tracking number" placeholder="Tracking number" value={shipment.trackingNumber} onChange={(event) => setShipment({ ...shipment, trackingNumber: event.target.value })} className="input" />
                  <button type="submit" className="btn btn-outline">Add shipment</button>
                </form>
              )}

              {remaining > 0 && order.paymentIntentId && (
                <form onSubmit={(event) => { event.preventDefault(); if (window.confirm('Issue this refund? This cannot be undone.')) act(() => apiRequest(`/admin/orders/${id}/refunds`, { method: 'POST', body: { ...(refund.amount ? { amount: Math.round(Number(refund.amount) * 100) } : {}), reason: refund.reason, restock: refund.restock } }), 'Refund issued') }} className="space-y-3 rounded-lg border border-white/15 p-4">
                  <h3 className="font-bold">Refund (up to {money(remaining)})</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input aria-label="Refund amount" type="number" min="0.01" step="0.01" max={remaining / 100} placeholder={`Amount (${currencySymbol(order.currency)}) - blank for full`} value={refund.amount} onChange={(event) => setRefund({ ...refund, amount: event.target.value })} className="input" />
                    <input required minLength={3} aria-label="Refund reason" placeholder="Reason" value={refund.reason} onChange={(event) => setRefund({ ...refund, reason: event.target.value })} className="input" />
                  </div>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={refund.restock} onChange={(event) => setRefund({ ...refund, restock: event.target.checked })} /> Return items to stock (full refunds only)</label>
                  <button type="submit" className="btn btn-danger">Issue refund</button>
                </form>
              )}
              {refunds.map((item) => <p key={item.id} className="text-white/70">Refund {money(item.amount)} · {titleCase(item.status)} · {item.reason}</p>)}
              <Notice>{error}</Notice>
              {invoiceOpen && <Invoice order={order} customer={order.user} onClose={() => setInvoiceOpen(false)} />}
            </div>
          )
        }}
      </Loaded>
    </Modal>
  )
}

export default function OrdersPanel() {
  const [filter, setFilter] = useState('')
  const result = useFetch(`/admin/orders?limit=100${filter ? `&status=${filter}` : ''}`)
  const [openId, setOpenId] = useState(null)
  return (
    <>
      <PanelHeader title="Orders" action={<select aria-label="Filter by status" value={filter} onChange={(event) => setFilter(event.target.value)} className="input w-44"><option value="">All statuses</option>{['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select>} />
      <Loaded result={result}>
        {({ data }) => (
          <Table rows={data} empty="No orders match this filter." columns={[
            { header: 'Order', render: (order) => <strong>{order.number}{order.requiresAttention && <AlertTriangle size={14} className="ml-1 inline text-amber-300" aria-label="Needs attention" />}</strong> },
            { header: 'Customer', render: (order) => order.user?.name || '—' },
            { header: 'Date', render: (order) => shortDate(order.createdAt) },
            { header: 'Payment', render: (order) => <span className="flex flex-col gap-1"><Badge tone={paymentInfo(order).tone}>{paymentInfo(order).label}</Badge><span className="text-xs text-white/50">{order.paymentMethod === 'cod' ? 'COD' : 'Online'}</span></span> },
            { header: 'Delivery', render: (order) => <Badge tone={deliveryInfo(order).tone}>{deliveryInfo(order).label}</Badge> },
            { header: 'Total', render: (order) => formatMoney(order.totalAmount, order.currency) },
            { header: '', render: (order) => <button type="button" onClick={() => setOpenId(order.id)} className="btn btn-outline btn-sm float-right">Open</button> },
          ]} />
        )}
      </Loaded>
      {openId && <OrderDetail id={openId} onClose={() => setOpenId(null)} onChanged={result.reload} />}
    </>
  )
}
