import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

const icons = { success: CheckCircle2, error: XCircle, info: Info }
const tones = {
  success: 'border-emerald-300/30 text-emerald-50',
  error: 'border-red-300/40 text-red-50',
  info: 'border-white/25 text-white',
}

export default function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[90] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2" aria-live="polite">
      {toasts.map((item) => {
        const Icon = icons[item.type]
        return (
          <div key={item.id} role={item.type === 'error' ? 'alert' : 'status'} className={`toast pointer-events-auto flex items-start gap-3 rounded-xl border bg-slate-950/95 px-4 py-3 text-sm shadow-2xl backdrop-blur ${tones[item.type]}`}>
            <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="flex-1">{item.message}</p>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(item.id)} className="text-white/60 hover:text-white"><X size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}
