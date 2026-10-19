import { AlertTriangle, LoaderCircle } from 'lucide-react'

export function Spinner({ className = 'h-5 w-5' }) {
  return <LoaderCircle className={`${className} animate-spin`} aria-hidden="true" />
}

export function PageLoader() {
  return (
    <div role="status" className="flex min-h-[50vh] items-center justify-center text-white/70">
      <Spinner className="h-8 w-8" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-14 text-center fade-in">
      {Icon && <Icon className="mx-auto text-white/50" size={40} aria-hidden="true" />}
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-white/65">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-300/25 bg-red-500/10 px-6 py-10 text-center">
      <AlertTriangle className="mx-auto text-red-200" size={32} aria-hidden="true" />
      <p className="mt-3 text-sm text-red-100">{message || 'Something went wrong.'}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn btn-outline btn-sm mt-5">Try again</button>}
    </div>
  )
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="p-3">
          <div className="skeleton aspect-square" />
          <div className="skeleton mt-4 h-4 w-1/3" />
          <div className="skeleton mt-3 h-5 w-3/4" />
          <div className="skeleton mt-3 h-5 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function FieldError({ children }) {
  if (!children) return null
  return <p role="alert" className="mt-1.5 text-xs text-red-200">{children}</p>
}

export function Notice({ type = 'error', children }) {
  if (!children) return null
  const styles = type === 'error' ? 'border-red-300/25 bg-red-500/10 text-red-100' : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
  return <p role={type === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</p>
}
