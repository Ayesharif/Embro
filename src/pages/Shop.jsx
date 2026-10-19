import { ChevronLeft, ChevronRight, PackageSearch, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../component/PageHeader'
import ProductCard from '../component/ProductCard'
import Seo from '../component/Seo'
import { EmptyState, ErrorState, ProductGridSkeleton } from '../component/States'
import { useFetch } from '../hooks/useFetch'

const sorts = [
  ['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['rating', 'Top rated'], ['name', 'Name A-Z'],
]
const PAGE_SIZE = 9

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const sort = params.get('sort') || 'newest'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [search, setSearch] = useState(q)
  const { data: categories } = useFetch('/categories')

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: '', ...changes }).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    setParams(next)
  }

  // Debounced search: the URL (and therefore the request) only changes after a pause in typing.
  useEffect(() => {
    if (search === q) return undefined
    const timer = setTimeout(() => {
      const next = new URLSearchParams(window.location.search)
      if (search) next.set('q', search); else next.delete('q')
      next.delete('page')
      setParams(next, { replace: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [search, q, setParams])

  const query = new URLSearchParams({ sort, page: String(page), limit: String(PAGE_SIZE), ...(q && { q }), ...(category && { category }) })
  const { data, error, loading, reload } = useFetch(`/products?${query}`)
  const activeCategory = categories?.data.find((item) => item.slug === category)
  const pagination = data?.pagination
  const indexable = !q && !params.get('sort') && page === 1 && (!category || activeCategory)
  const canonical = category && !q && !params.get('sort') && page === 1
    ? `/products?category=${encodeURIComponent(category)}`
    : '/products'

  return (
    <>
      <Seo
        title={activeCategory ? activeCategory.name : 'Products'}
        description={activeCategory?.description || 'Browse our full range of yarn, beads and threads.'}
        canonical={canonical}
        robots={indexable ? 'index,follow' : 'noindex,follow'}
      />
      <PageHeader title={activeCategory ? activeCategory.name : 'Products'} crumbs={[{ label: 'Products' }]} />

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[16rem_1fr]">
        <aside className="panel h-fit space-y-6 p-5" aria-label="Filters">
          <div>
            <label htmlFor="shop-search" className="label">Search</label>
            <div className="relative mt-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
              <input id="shop-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="input pl-9" />
            </div>
          </div>
          <div>
            <h2 className="label">Categories</h2>
            <div className="mt-2 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {[{ slug: '', name: 'All products' }, ...(categories?.data || [])].map((item) => (
                <button key={item.slug || 'all'} type="button" aria-pressed={category === item.slug} onClick={() => update({ category: item.slug })} className={`rounded-lg px-3 py-2 text-left text-sm transition ${category === item.slug ? 'bg-white font-semibold text-slate-900' : 'bg-white/5 text-white/80 hover:bg-white/15'}`}>{item.name}</button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="shop-sort" className="label">Sort by</label>
            <select id="shop-sort" value={sort} onChange={(event) => update({ sort: event.target.value === 'newest' ? '' : event.target.value })} className="input mt-2">
              {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {(q || category) && <button type="button" onClick={() => { setSearch(''); setParams({}) }} className="btn btn-outline btn-sm btn-block"><X size={14} /> Clear filters</button>}
        </aside>

        <div>
          <p className="mb-4 text-sm text-white/65" aria-live="polite">{loading ? 'Loading products...' : `${pagination?.total ?? 0} product${pagination?.total === 1 ? '' : 's'}`}</p>
          {loading && <ProductGridSkeleton count={6} />}
          {error && <ErrorState message={error.message} onRetry={reload} />}
          {data && !data.data.length && <EmptyState icon={PackageSearch} title="No products found" description="Try a different search or clear your filters." />}
          {data?.data.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.data.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
          {pagination?.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
              <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className="btn btn-outline btn-sm"><ChevronLeft size={16} /> Previous</button>
              <span className="text-sm text-white/70">Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" disabled={!pagination.hasNextPage} onClick={() => update({ page: String(page + 1) })} className="btn btn-outline btn-sm">Next <ChevronRight size={16} /></button>
            </nav>
          )}
        </div>
      </section>
    </>
  )
}
