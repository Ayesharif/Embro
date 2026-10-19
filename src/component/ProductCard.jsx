import { Heart, ShoppingCart } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import placeholder from '../assets/banner1.png'
import { useAuth } from '../auth/AuthContext'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { money } from '../utils/format'
import Stars from './Stars'

export default function ProductCard({ product }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const addToCart = useCartStore((state) => state.add)
  const busy = useCartStore((state) => state.busy)
  const wished = useWishlistStore((state) => state.items.some((item) => item.id === product.id))
  const toggleWishlist = useWishlistStore((state) => state.toggle)

  const href = `/products/${product.slug || product.id}`
  const image = product.image || placeholder
  const onSale = product.discountPercent > 0
  const hasOptions = product.variants?.length > 1

  const onWishlist = () => {
    if (!isAuthenticated) return navigate('/auth/login', { state: { from: location } })
    return toggleWishlist(product.id)
  }

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl p-3 text-white transition duration-300 hover:bg-black/25">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white/5">
        <Link to={href} className="h-full w-full" aria-label={`View ${product.name}`}>
          <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-105" />
        </Link>
        {onSale && <span className="badge badge-sale absolute left-3 top-3">-{product.discountPercent}%</span>}
        {!product.inStock && <span className="badge absolute bottom-3 left-3 bg-black/70">Sold out</span>}
        <button
          type="button"
          aria-pressed={wished}
          aria-label={`${wished ? 'Remove' : 'Add'} ${product.name} ${wished ? 'from' : 'to'} wishlist`}
          onClick={onWishlist}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-white backdrop-blur transition hover:bg-slate-700"
        >
          <Heart size={20} fill={wished ? 'currentColor' : 'none'} className={wished ? 'text-rose-400' : ''} />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-xs uppercase tracking-wider text-white/60">{product.category?.name}</p>
        <Link to={href} className="mt-1 line-clamp-2 text-lg font-semibold hover:text-white/75">{product.name}</Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <span className="text-xl font-semibold">{product.hasPriceRange && <span className="mr-1 text-xs font-normal text-white/60">From</span>}{money(product.finalAmount)}</span>
            {onSale && <span className="text-sm text-white/50 line-through">{money(product.sellingAmount)}</span>}
          </p>
          <Stars value={product.ratingAverage} count={product.ratingCount} size="text-sm" />
        </div>
        <div className="mt-4">
          {hasOptions ? (
            <Link to={href} className="btn btn-outline btn-block">Choose options</Link>
          ) : (
            <button type="button" disabled={!product.inStock || busy || !product.variants?.length} onClick={() => addToCart(product.id, { variantId: product.variants[0]?.id })} className="btn btn-outline btn-block">
              <ShoppingCart size={17} aria-hidden="true" />
              {product.inStock ? 'Add to cart' : 'Sold out'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
