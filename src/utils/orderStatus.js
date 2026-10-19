import { money } from './format'

// Shared wording for the two statuses customers and staff care about: has it been paid, and where is it?

export function paymentInfo(order) {
  const cod = order.paymentMethod === 'cod'
  const method = cod ? 'Cash on delivery' : 'Online (card)'
  if (order.status === 'cancelled') return { label: 'Not charged', tone: 'badge-bad', method, hint: 'This order was cancelled.' }
  switch (order.paymentStatus) {
    case 'paid': return { label: cod ? 'Paid (cash collected)' : 'Paid', tone: 'badge-ok', method, hint: cod ? 'Cash was collected on delivery.' : 'Payment received. Thank you!' }
    case 'partially_refunded': return { label: 'Partially refunded', tone: 'badge-warn', method, hint: `${money(order.refundedAmount, order.currency)} refunded.` }
    case 'refunded': return { label: 'Refunded', tone: 'badge-bad', method, hint: 'The full amount was refunded.' }
    case 'failed': return { label: 'Payment failed', tone: 'badge-bad', method, hint: 'The payment did not go through.' }
    default: return { label: cod ? 'Pay on delivery' : 'Awaiting payment', tone: 'badge-warn', method, hint: cod ? `Please have ${money(order.totalAmount - (order.refundedAmount || 0), order.currency)} in cash ready for the courier.` : 'We are waiting for your payment.' }
  }
}

export const deliverySteps = [
  { key: 'pending', label: 'Order placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
]

export function deliveryInfo(order) {
  const key = order.deliveryStatus || 'pending'
  if (key === 'cancelled') return { key, label: order.status === 'refunded' ? 'Refunded' : 'Cancelled', tone: 'badge-bad', step: -1 }
  const step = Math.max(0, deliverySteps.findIndex((item) => item.key === key))
  const tone = key === 'delivered' ? 'badge-ok' : key === 'pending' ? '' : 'badge-warn'
  return { key, label: deliverySteps[step].label, tone, step }
}
