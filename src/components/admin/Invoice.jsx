import { Printer, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { site } from '../../config/site'
import { money as formatMoney, shortDate } from '../../utils/format'
import { paymentInfo } from '../../utils/orderStatus'

function Party({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="space-y-0.5 text-[13px] leading-5 text-slate-700">{children}</div>
    </div>
  )
}

// A4 invoice rendered into <body> (outside the app root) so printing shows only the paper.
export default function Invoice({ order, customer, onClose }) {
  const invoiceNumber = `INV-${order.number.replace(/^ORD-/, '')}`

  useEffect(() => {
    const previousTitle = document.title
    document.title = `Invoice ${invoiceNumber}`
    document.body.style.overflow = 'hidden'
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.title = previousTitle
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [invoiceNumber, onClose])

  const money = (amount) => formatMoney(amount, order.currency)
  const payment = paymentInfo(order)
  const address = order.addressSnapshot
  const refunded = order.refundedAmount || 0
  const settled = ['paid', 'partially_refunded', 'refunded'].includes(order.paymentStatus)
  const cancelled = order.status === 'cancelled'
  const balanceDue = settled || cancelled ? 0 : order.totalAmount
  const stamp = cancelled
    ? { text: 'Cancelled', style: 'border-slate-400 text-slate-500' }
    : order.paymentStatus === 'refunded'
      ? { text: 'Refunded', style: 'border-rose-500 text-rose-600' }
      : settled
        ? { text: 'Paid', style: 'border-emerald-600 text-emerald-700' }
        : { text: 'Payment due', style: 'border-amber-500 text-amber-600' }

  return createPortal(
    <div className="invoice-overlay fixed inset-0 z-[100] overflow-y-auto bg-slate-950/90 px-3 py-6 sm:px-6" role="dialog" aria-modal="true" aria-label={`Invoice ${invoiceNumber}`}>
      <div className="invoice-toolbar mx-auto mb-4 flex max-w-[820px] items-center justify-between text-white">
        <p className="text-sm text-white/70">Invoice preview - use <strong>Save as PDF</strong> in the print dialog to download.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm"><Printer size={15} /> Print / Save PDF</button>
          <button type="button" onClick={onClose} aria-label="Close invoice" className="btn btn-outline btn-sm"><X size={15} /></button>
        </div>
      </div>

      <article className="invoice-paper mx-auto w-full max-w-[820px] overflow-hidden bg-white text-slate-900 shadow-2xl" style={{ colorScheme: 'light' }}>
        <div className="invoice-accent h-2 bg-gradient-to-r from-slate-900 via-slate-700 to-cyan-600" />
        <div className="p-8 sm:p-12">
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">{site.name}</p>
              <p className="mt-1 max-w-[16rem] text-xs leading-5 text-slate-500">{site.address}<br />{site.email} · {site.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-light uppercase tracking-[0.2em] text-slate-300">Invoice</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{invoiceNumber}</p>
              <p className="text-xs text-slate-500">Issued {shortDate(new Date())}</p>
            </div>
          </header>

          <div className="relative mt-8 grid gap-6 border-y border-slate-200 py-6 sm:grid-cols-3">
            <Party title="Billed to">
              <p className="font-semibold text-slate-900">{customer?.name || address?.name}</p>
              {customer?.email && <p>{customer.email}</p>}
            </Party>
            <Party title="Ship to">
              {address ? (
                <>
                  <p className="font-semibold text-slate-900">{address.name}</p>
                  <p>{address.line1}{address.line2 && `, ${address.line2}`}</p>
                  <p>{address.city}{address.state && `, ${address.state}`} {address.postalCode}</p>
                  <p>{address.country}</p>
                  {address.phone && <p>Tel: {address.phone}</p>}
                </>
              ) : <p>-</p>}
            </Party>
            <Party title="Order details">
              <p><span className="text-slate-400">Order no.</span> <span className="font-semibold text-slate-900">{order.number}</span></p>
              <p><span className="text-slate-400">Order date</span> {shortDate(order.createdAt)}</p>
              <p><span className="text-slate-400">Payment</span> {payment.method}</p>
              {order.shippingMethodName && <p><span className="text-slate-400">Shipping</span> {order.shippingMethodName}</p>}
            </Party>
            <span className={`absolute right-0 top-1/2 hidden -translate-y-1/2 -rotate-6 rounded-md border-[3px] px-3 py-1 text-lg font-extrabold uppercase tracking-widest opacity-80 sm:block ${stamp.style}`} aria-label={`Status: ${stamp.text}`}>{stamp.text}</span>
          </div>

          <table className="mt-8 w-full text-left text-[13px]">
            <thead>
              <tr className="invoice-head bg-slate-900 text-[11px] uppercase tracking-wider text-white">
                <th className="w-10 px-3 py-2.5 font-semibold">#</th>
                <th className="px-3 py-2.5 font-semibold">Description</th>
                <th className="px-3 py-2.5 text-center font-semibold">Qty</th>
                <th className="px-3 py-2.5 text-right font-semibold">Unit price</th>
                <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items.map((item, index) => (
                <tr key={item.id || index} className="break-inside-avoid">
                  <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-3 py-3"><p className="font-semibold text-slate-900">{item.productNameSnapshot}</p>{item.variantLabel && <p className="text-xs text-slate-500">{item.variantLabel}</p>}{item.skuSnapshot && <p className="text-xs text-slate-400">SKU {item.skuSnapshot}</p>}</td>
                  <td className="px-3 py-3 text-center">{item.quantity}</td>
                  <td className="px-3 py-3 text-right">{money(item.unitAmount)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">{money(item.lineTotalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end break-inside-avoid">
            <dl className="w-full max-w-xs space-y-1.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{money(order.subtotalAmount)}</dd></div>
              {order.discountAmount > 0 && <div className="flex justify-between"><dt className="text-slate-500">Discount{order.discountCode && ` (${order.discountCode})`}</dt><dd>-{money(order.discountAmount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Shipping</dt><dd>{money(order.shippingAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd>{money(order.taxAmount)}</dd></div>
              <div className="invoice-total flex justify-between rounded-md bg-slate-900 px-3 py-2.5 text-base font-bold text-white"><dt>Total</dt><dd>{money(order.totalAmount)}</dd></div>
              {settled && <div className="flex justify-between pt-1"><dt className="text-slate-500">Amount paid</dt><dd className="font-semibold text-emerald-700">{money(order.totalAmount)}</dd></div>}
              {refunded > 0 && <div className="flex justify-between"><dt className="text-slate-500">Refunded</dt><dd className="text-rose-600">-{money(refunded)}</dd></div>}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold"><dt>Balance due</dt><dd className={balanceDue > 0 ? 'text-amber-600' : 'text-slate-900'}>{money(balanceDue)}</dd></div>
            </dl>
          </div>

          <footer className="mt-12 grid gap-6 break-inside-avoid border-t border-slate-200 pt-6 text-xs leading-5 text-slate-500 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-bold uppercase tracking-wider text-slate-700">Payment notes</p>
              <p>{order.paymentMethod === 'cod' && !settled ? `Please pay ${money(balanceDue)} in cash to the courier on delivery.` : 'Payment received in full. Thank you for your purchase.'}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm font-semibold text-slate-800">Thank you for shopping with {site.name}!</p>
              <p>Questions about this invoice? Contact {site.email}.</p>
            </div>
          </footer>
          <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-slate-300">Computer-generated invoice - no signature required</p>
        </div>
      </article>
    </div>,
    document.body,
  )
}
