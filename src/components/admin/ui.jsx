import { X } from 'lucide-react'
import { useEffect } from 'react'
import { ErrorState, PageLoader } from '../../component/States'

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="fade-in fixed inset-0 bg-black/70" />
      <div className={`panel fade-in relative my-8 w-full bg-slate-950 p-6 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button type="button" aria-label="Close" onClick={onClose} className="text-white/60 hover:text-white"><X /></button></div>
        {children}
      </div>
    </div>
  )
}

// Wraps a useFetch result with loading / error handling so each panel only renders the happy path.
export function Loaded({ result, children }) {
  if (result.loading) return <PageLoader />
  if (result.error) return <ErrorState message={result.error.message} onRetry={result.reload} />
  return children(result.data)
}

export function Table({ columns, rows, empty = 'Nothing to show yet.' }) {
  if (!rows.length) return <p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-white/60">{empty}</p>
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-white/55"><tr>{columns.map((column) => <th key={column.header} className="px-4 py-3 font-semibold">{column.header}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.header} className="px-4 py-3 align-middle">{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

export function PanelHeader({ title, action }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{title}</h1>{action}</div>
}
