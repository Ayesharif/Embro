import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import placeholder from '../assets/banner1.png'
import { useAuth } from '../auth/AuthContext'
import { useCartStore } from '../stores/cartStore'
import { money } from '../utils/format'

export function CartLines({ compact = false }) {
  const cart = useCartStore((state) => state.cart)
  const busy = useCartStore((state) => state.busy)
  const setQuantity = useCartStore((state) => state.setQuantity)
  const remove = useCartStore((state) => state.remove)

  return (
    <ul className="divide-y divide-white/10">
      {cart.items.map((item) => (
        <li key={item.id} className={`flex items-start gap-3 ${compact ? 'py-3' : 'py-5'}`}>
          <img src={item.image || placeholder} alt="" className={`${compact ? 'h-16 w-16' : 'h-20 w-20'} shrink-0 rounded-lg border border-white/15 bg-white/5 object-contain p-1`} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{item.name}</p>
            {item.variantLabel && <p className="text-xs text-white/60">{item.variantLabel}</p>}
            {item.unavailable ? (
              <p className="mt-1 text-xs text-red-200">{item.unavailableReason}</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/70">{money(item.unitAmount)}</p>
                {item.outOfStock && <p className="mt-1 text-xs text-amber-200">Only {item.stockAvailable} left in stock</p>}
                <div className="mt-2 inline-flex items-center rounded-lg border border-white/20">
                  <button type="button" aria-label={`Decrease quantity of ${item.name}`} disabled={busy || item.quantity <= 1} onClick={() => setQuantity(item.id, item.quantity - 1)} className="p-1.5 disabled:opacity-30"><Minus size={14} /></button>
                  <span className="min-w-8 text-center text-sm" aria-live="polite">{item.quantity}</span>
                  <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={busy || item.quantity >= item.stockAvailable} onClick={() => setQuantity(item.id, item.quantity + 1)} className="p-1.5 disabled:opacity-30"><Plus size={14} /></button>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {!item.unavailable && <p className="text-sm font-semibold">{money(item.lineTotalAmount)}</p>}
            <button type="button" aria-label={`Remove ${item.name}`} disabled={busy} onClick={() => remove(item.id)} className="text-white/60 transition hover:text-red-200"><Trash2 size={17} /></button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function CartDrawer() {
  const open = useCartStore((state) => state.drawerOpen)
  const close = useCartStore((state) => state.closeDrawer)
  const cart = useCartStore((state) => state.cart)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => event.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close])

  if (!open) return null

  const checkout = () => {
    close()
    navigate(isAuthenticated ? '/checkout' : '/auth/login', { state: { from: { pathname: '/checkout' } } })
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button type="button" aria-label="Close cart" onClick={close} className="fade-in absolute inset-0 bg-black/60" />
      <aside className="drawer absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/15 bg-slate-950 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
          <h2 className="text-lg font-bold">Your cart ({cart.itemCount})</h2>
          <button type="button" aria-label="Close cart" onClick={close} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"><X /></button>
        </div>
        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag size={44} className="text-white/40" aria-hidden="true" />
            <p className="text-white/70">Your cart is empty.</p>
            <Link to="/products" onClick={close} className="btn btn-primary">Start shopping</Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5"><CartLines compact /></div>
            <div className="border-t border-white/15 px-5 py-4">
              <p className="flex justify-between text-lg font-bold"><span>Subtotal</span><span>{money(cart.subtotalAmount)}</span></p>
              <p className="mt-1 text-xs text-white/55">Shipping and taxes are calculated at checkout.</p>
              <button type="button" onClick={checkout} disabled={cart.hasProblems} className="btn btn-primary btn-block mt-4">Checkout</button>
              {cart.hasProblems && <p className="mt-2 text-center text-xs text-amber-200">Fix the highlighted items to continue.</p>}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
