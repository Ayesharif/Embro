import { Link } from 'react-router-dom'
import Seo from '../component/Seo'

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Seo title="Page not found" robots="noindex,follow" />
      <p className="text-6xl font-extrabold text-white/30">404</p>
      <h1 className="mt-4 text-3xl font-bold">We couldn't find that page</h1>
      <p className="mt-2 max-w-md text-white/65">The link may be broken or the page may have moved.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn btn-primary">Back to home</Link>
        <Link to="/products" className="btn btn-outline">Browse products</Link>
      </div>
    </section>
  )
}
