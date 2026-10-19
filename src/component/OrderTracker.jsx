import { Check } from 'lucide-react'
import { deliveryInfo, deliverySteps } from '../utils/orderStatus'

export default function OrderTracker({ order }) {
  const info = deliveryInfo(order)
  if (info.step < 0) return <p role="status" className="rounded-lg border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">This order was {info.label.toLowerCase()}.</p>
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label={`Delivery progress: ${info.label}`}>
      {deliverySteps.map((step, index) => {
        const done = index < info.step || info.key === 'delivered'
        const current = index === info.step && info.key !== 'delivered'
        return (
          <li key={step.key} aria-current={current ? 'step' : undefined} className="relative text-center">
            {index > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= info.step ? 'bg-emerald-400' : 'bg-white/15'}`} />}
            <span className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${done ? 'border-emerald-400 bg-emerald-400 text-slate-900' : current ? 'border-white bg-slate-900 text-white ring-4 ring-white/15' : 'border-white/25 bg-slate-900 text-white/40'}`}>
              {done ? <Check size={15} /> : index + 1}
            </span>
            <span className={`mt-2 block text-xs ${current || done ? 'font-semibold text-white' : 'text-white/45'}`}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
