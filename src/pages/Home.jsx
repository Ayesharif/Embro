import { ArrowRight, Headphones, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductCard from '../component/ProductCard'
import ReviewsSection from '../component/ReviewsSection'
import Seo from '../component/Seo'
import Slider from '../component/Slider'
import { organizationSchema } from '../utils/seoSchemas'
import { ErrorState, ProductGridSkeleton } from '../component/States'
import { useFetch } from '../hooks/useFetch'

const benefits = [
  { icon: Truck, title: 'Free shipping', text: 'On qualifying orders' },
  { icon: RotateCcw, title: 'Easy returns', text: 'Money-back guarantee' },
  { icon: ShieldCheck, title: 'Secure payments', text: 'Processed by Stripe' },
  { icon: Headphones, title: 'Friendly support', text: 'We reply within a day' },
]

function Section({ title, subtitle, to, children }) {
  return (
    <section className="container-page py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-white/65">{subtitle}</p>}
        </div>
        {to && <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-white/80 transition hover:text-white">View all <ArrowRight size={16} /></Link>}
      </div>
      {children}
    </section>
  )
}

function ProductRow({ path }) {
  const { data, error, loading, reload } = useFetch(path)
  if (loading) return <ProductGridSkeleton count={3} />
  if (error) return <ErrorState message={error.message} onRetry={reload} />
  if (!data.data.length) return <p className="text-white/60">Nothing here yet - check back soon.</p>
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {data.data.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  )
}

export default function Home() {
  const { data: categories } = useFetch('/categories')
  return (
    <>
      <Seo description="Shop quality yarn, beads and threads for your next creative project." jsonLd={organizationSchema()} />
      <Slider />

      <div className="border-y border-white/10 bg-black/30">
        <ul className="container-page grid grid-cols-2 gap-5 py-6 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3">
              <Icon size={26} className="shrink-0 text-cyan-200" aria-hidden="true" />
              <div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-white/60">{text}</p></div>
            </li>
          ))}
        </ul>
      </div>

      {categories?.data.length > 0 && (
        <Section title="Shop by category">
          <div className="grid gap-4 sm:grid-cols-3">
            {categories.data.map((category) => (
              <Link key={category.id} to={`/products?category=${category.slug}`} className="group relative isolate flex min-h-44 items-end overflow-hidden rounded-2xl border border-white/15 bg-slate-900 transition hover:border-white/40">
                {category.image && <img src={category.image} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="flex w-full items-center justify-between p-5">
                  <div>
                    <h3 className="text-xl font-bold">{category.name}</h3>
                    {category.description && <p className="mt-1 line-clamp-2 text-sm text-white/70">{category.description}</p>}
                  </div>
                  <ArrowRight className="shrink-0 transition group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="Featured products" subtitle="Hand-picked favourites from our collection" to="/products">
        <ProductRow path="/products?featured=true&limit=6" />
      </Section>
      <Section title="New arrivals" subtitle="Fresh additions to the shelves" to="/products?sort=newest">
        <ProductRow path="/products?newArrival=true&limit=3" />
      </Section>
      <ReviewsSection />
    </>
  )
}
