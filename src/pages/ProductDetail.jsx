import { Heart, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import placeholder from '../assets/banner1.png'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../component/PageHeader'
import ProductCard from '../component/ProductCard'
import Seo from '../component/Seo'
import ReviewComposer from '../component/ReviewComposer'
import { ErrorState, FieldError, PageLoader } from '../component/States'
import Stars from '../component/Stars'
import { useFetch } from '../hooks/useFetch'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { money, shortDate } from '../utils/format'

function Reviews({ productId, isAuthenticated }) {
  const { data, loading, reload } = useFetch(`/products/${productId}/reviews`)
  const [writing, setWriting] = useState(false)
  const mine = data?.mine
  const mineText = mine && (mine.status === 'approved' ? 'Your review is published. Thank you!' : mine.status === 'pending' ? 'Your review is awaiting approval.' : 'Your review is not currently shown.')
  return (
    <section className="mt-14" aria-labelledby="reviews-heading">
      <div className="flex items-center justify-between">
        <h2 id="reviews-heading" className="text-2xl font-bold">Customer reviews</h2>
        {mine ? <span className="badge">{mineText}</span> : isAuthenticated ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setWriting((value) => !value)}>{writing ? 'Cancel' : 'Write a review'}</button> : <Link to="/auth/login" className="text-sm underline">Sign in to review</Link>}
      </div>
      {writing && <div className="panel mt-6 p-6"><ReviewComposer productId={productId} onDone={reload} /></div>}
      {loading && <p className="mt-4 text-white/60">Loading reviews...</p>}
      {data?.data.length === 0 && <p className="mt-4 text-white/60">No reviews yet. Be the first to share your thoughts.</p>}
      <ul className="mt-6 space-y-4">
        {data?.data.map((review) => (
          <li key={review.id} className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars value={review.rating} />
              <span className="text-xs text-white/50">{shortDate(review.createdAt)}</span>
            </div>
            {review.title && <h3 className="mt-2 font-semibold">{review.title}</h3>}
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/80">{review.body}</p>
            <p className="mt-3 text-xs text-white/50">{review.author}{review.verifiedPurchase && <span className="badge badge-ok ml-2">Verified purchase</span>}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function OptionGroup({ title, options, selected, onSelect, isAvailable, swatch = false }) {
  return (
    <fieldset className="mt-6">
      <legend className="label">{title}{selected && <span className="ml-2 font-normal text-white/60">{selected}</span>}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const available = isAvailable(option)
          return (
            <button key={option} type="button" aria-pressed={option === selected} onClick={() => onSelect(option === selected ? '' : option)} className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${option === selected ? 'border-white bg-white font-semibold text-slate-900' : 'border-white/25 hover:border-white/60'} ${available ? '' : 'opacity-45 line-through'}`}>
              {swatch && <span aria-hidden="true" className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: option.toLowerCase() }} />}
              {option}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const { data, error, loading, reload } = useFetch(`/products/${id}`)
  const product = data?.product
  const { data: settings } = useFetch('/settings/public')
  const { data: related } = useFetch(product?.category?.slug ? `/products?category=${product.category.slug}&limit=4` : null)

  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const addToCart = useCartStore((state) => state.add)
  const busy = useCartStore((state) => state.busy)
  const wished = useWishlistStore((state) => state.items.some((item) => item.id === product?.id))
  const toggleWishlist = useWishlistStore((state) => state.toggle)

  const [selection, setSelection] = useState({ productId: null, color: '', size: '', picked: '', quantity: 1, showError: false })
  // Selection state belongs to one product; reset it when the route changes to another.
  const current = selection.productId === product?.id ? selection : { productId: product?.id, color: '', size: '', picked: '', quantity: 1, showError: false }
  const patch = (changes) => setSelection({ ...current, ...changes })

  if (loading) return <PageLoader />
  if (error) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error.status === 404 ? 'This product could not be found.' : error.message} onRetry={error.status === 404 ? undefined : reload} />
        <div className="mt-6 text-center"><Link to="/products" className="btn btn-outline">Back to products</Link></div>
      </div>
    )
  }

  const { variants, colors, sizes } = product
  // A single colour or size needs no choosing.
  const color = current.color || (colors.length === 1 ? colors[0] : '')
  const size = current.size || (sizes.length === 1 ? sizes[0] : '')
  const chosen = variants.find((variant) => (!colors.length || variant.color === color) && (!sizes.length || variant.size === size))
  const colorVariant = variants.find((variant) => variant.color === color && variant.image)

  const gallery = [...new Set(variants.map((variant) => variant.image).filter(Boolean))]
  const mainImage = current.picked || chosen?.image || colorVariant?.image || gallery[0] || placeholder
  const currency = settings?.currency?.code || 'USD'
  const productUrl = `/products/${product.slug || product.id}`
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    url: new URL(productUrl, window.location.origin).toString(),
    image: gallery.length ? gallery : [mainImage],
    ...(product.category?.name ? { category: product.category.name } : {}),
    brand: { '@type': 'Brand', name: 'Lembro' },
    offers: product.variants.map((variant) => ({
      '@type': 'Offer',
      url: new URL(productUrl, window.location.origin).toString(),
      priceCurrency: currency,
      price: variant.finalAmount.toFixed(2),
      availability: variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    })),
    ...(product.ratingCount > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.ratingAverage,
        reviewCount: product.ratingCount,
      },
    } : {}),
  }
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: window.location.origin },
      { '@type': 'ListItem', position: 2, name: 'Products', item: new URL('/products', window.location.origin).toString() },
      ...(product.category ? [{ '@type': 'ListItem', position: 3, name: product.category.name, item: new URL(`/products?category=${product.category.slug}`, window.location.origin).toString() }] : []),
      { '@type': 'ListItem', position: product.category ? 4 : 3, name: product.name, item: new URL(productUrl, window.location.origin).toString() },
    ],
  }
  const colorAvailable = (option) => variants.some((variant) => variant.color === option && (!size || variant.size === size) && variant.stock > 0)
  const sizeAvailable = (option) => variants.some((variant) => variant.size === option && (!color || variant.color === color) && variant.stock > 0)

  const available = chosen?.stock ?? 0
  const quantity = Math.min(current.quantity, Math.max(1, available))
  const unit = chosen ? chosen.finalAmount : product.finalAmount
  const original = chosen ? chosen.sellingAmount : product.sellingAmount
  const discount = chosen ? chosen.discountPercent : product.discountPercent

  const onAdd = () => {
    if (!chosen) return patch({ showError: true })
    return addToCart(product.id, { variantId: chosen.id, quantity })
  }
  const onWishlist = () => (isAuthenticated ? toggleWishlist(product.id) : navigate('/auth/login', { state: { from: location } }))

  return (
    <>
      <Seo
        title={product.name}
        description={product.description}
        canonical={productUrl}
        image={mainImage}
        type="product"
        jsonLd={[productSchema, breadcrumbSchema]}
      />
      <PageHeader title={product.name} crumbs={[{ label: 'Products', to: '/products' }, ...(product.category ? [{ label: product.category.name, to: `/products?category=${product.category.slug}` }] : []), { label: product.name }]} />

      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="panel flex aspect-square items-center justify-center overflow-hidden p-4">
              <img src={mainImage} alt={product.name} fetchPriority="high" className="h-full w-full object-contain" />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto">
                {gallery.map((url, index) => (
                  <button key={url} type="button" aria-label={`Show image ${index + 1}`} aria-current={url === mainImage} onClick={() => patch({ picked: url })} className={`h-20 w-20 shrink-0 rounded-lg border bg-white/5 p-1 ${url === mainImage ? 'border-white' : 'border-white/20'}`}>
                    <img src={url} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm uppercase tracking-wider text-white/60">{product.category?.name}</p>
            <h2 className="mt-1 text-3xl font-bold">{product.name}</h2>
            <div className="mt-3"><Stars value={product.ratingAverage} count={product.ratingCount} /></div>
            <p className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold">{!chosen && product.hasPriceRange && <span className="mr-2 text-base font-normal text-white/60">From</span>}{money(unit)}</span>
              {discount > 0 && <><span className="text-lg text-white/50 line-through">{money(original)}</span><span className="badge badge-sale">Save {discount}%</span></>}
            </p>
            <p className="mt-5 whitespace-pre-line leading-7 text-white/80">{product.description}</p>

            {colors.length > 0 && <OptionGroup title="Colour" options={colors} selected={color} swatch onSelect={(value) => patch({ color: value, picked: '', showError: false })} isAvailable={colorAvailable} />}
            {sizes.length > 0 && <OptionGroup title="Size" options={sizes} selected={size} onSelect={(value) => patch({ size: value, picked: '', showError: false })} isAvailable={sizeAvailable} />}
            {current.showError && <FieldError>Please choose {[colors.length > 1 && !color && 'a colour', sizes.length > 1 && !size && 'a size'].filter(Boolean).join(' and ') || 'an available option'} first.</FieldError>}
            {!chosen && (color || size) && variants.length > 0 && <FieldError>That combination is not available.</FieldError>}

            <p className="mt-5 text-sm">
              {!chosen ? null : available > 0 ? <span className={available <= 5 ? 'text-amber-200' : 'text-emerald-200'}>{available <= 5 ? `Only ${available} left` : 'In stock'}</span> : <span className="text-red-200">Out of stock</span>}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-lg border border-white/25">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => patch({ quantity: quantity - 1 })} className="p-3 disabled:opacity-30"><Minus size={16} /></button>
                <span className="min-w-10 text-center font-semibold" aria-live="polite">{quantity}</span>
                <button type="button" aria-label="Increase quantity" disabled={quantity >= Math.min(available, 20)} onClick={() => patch({ quantity: quantity + 1 })} className="p-3 disabled:opacity-30"><Plus size={16} /></button>
              </div>
              <button type="button" onClick={onAdd} disabled={busy || (chosen && available < 1) || !variants.length} className="btn btn-primary flex-1 sm:flex-none sm:px-10"><ShoppingCart size={18} /> Add to cart</button>
              <button type="button" onClick={onWishlist} aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'} className="btn btn-outline"><Heart size={18} fill={wished ? 'currentColor' : 'none'} className={wished ? 'text-rose-400' : ''} /></button>
            </div>
          </div>
        </div>

        <Reviews productId={product.id} isAuthenticated={isAuthenticated} />

        {related?.data.filter((item) => item.id !== product.id).length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold">You may also like</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.data.filter((item) => item.id !== product.id).slice(0, 3).map((item) => <ProductCard key={item.id} product={item} />)}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
