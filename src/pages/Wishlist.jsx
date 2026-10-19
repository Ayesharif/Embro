import { Heart, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../component/PageHeader'
import ProductCard from '../component/ProductCard'
import Seo from '../component/Seo'
import { EmptyState } from '../component/States'
import { useWishlistStore } from '../stores/wishlistStore'

export default function Wishlist() {
  const items = useWishlistStore((state) => state.items)
  const clear = useWishlistStore((state) => state.clear)

  return (
    <>
      <Seo title="Wishlist" robots="noindex,nofollow" />
      <PageHeader title="Wishlist" crumbs={[{ label: 'Wishlist' }]} />
      <section className="container-page py-10">
        {items.length === 0 ? (
          <EmptyState icon={Heart} title="Your wishlist is empty" description="Tap the heart on any product to save it here for later." action={<Link to="/products" className="btn btn-primary">Browse products</Link>} />
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-white/70">{items.length} saved item{items.length === 1 ? '' : 's'}</p>
              <button type="button" onClick={clear} className="btn btn-outline btn-sm"><Trash2 size={15} /> Clear wishlist</button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </>
        )}
      </section>
    </>
  )
}
