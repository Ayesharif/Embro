import { BadgeCheck, MessageSquarePlus, Quote, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useFetch } from '../hooks/useFetch'
import { shortDate } from '../utils/format'
import ReviewComposer from './ReviewComposer'
import Stars from './Stars'

function ReviewCard({ review }) {
  return (
    <figure className="panel flex h-full w-[19rem] shrink-0 flex-col p-6 sm:w-[22rem]">
      <Quote size={22} className="text-cyan-200/70" aria-hidden="true" />
      <Stars value={review.rating} size="text-lg" />
      {review.title && <p className="mt-2 font-semibold">{review.title}</p>}
      <blockquote className="mt-2 line-clamp-5 flex-1 text-sm leading-6 text-white/80">{review.body}</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-indigo-400 font-bold text-slate-900">{review.author.charAt(0).toUpperCase()}</span>
        <span className="min-w-0 text-sm">
          <span className="flex items-center gap-1.5 font-semibold">{review.author}{review.verifiedPurchase && <BadgeCheck size={15} className="text-emerald-300" aria-label="Verified purchase" />}</span>
          <Link to={`/products/${review.product.slug}`} className="block truncate text-xs text-white/55 hover:text-white">{review.product.name} · {shortDate(review.createdAt)}</Link>
        </span>
      </figcaption>
    </figure>
  )
}

function WriteReview({ onClose }) {
  const { data, loading } = useFetch('/reviews/eligible')
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Write a review">
      <button type="button" aria-label="Close" onClick={onClose} className="fade-in absolute inset-0 bg-black/70" />
      <div className="panel fade-in relative max-h-[92vh] w-full max-w-lg overflow-y-auto bg-slate-950 p-6 sm:p-8">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 text-white/60 hover:text-white"><X /></button>
        <h2 className="text-2xl font-bold">Share your experience</h2>
        <p className="mt-1 mb-6 text-sm text-white/65">Your honest review helps other makers choose.</p>
        {loading && <p className="text-white/60">Loading your purchases...</p>}
        {data && data.data.length === 0 && (
          <div className="rounded-lg bg-white/5 p-5 text-sm text-white/75">
            <p>You have no purchased products waiting for a review.</p>
            <Link to="/products" onClick={onClose} className="btn btn-outline btn-sm mt-4">Browse products</Link>
          </div>
        )}
        {data?.data.length > 0 && <ReviewComposer products={data.data} />}
      </div>
    </div>
  )
}

export default function ReviewsSection() {
  const { data, error } = useFetch('/reviews/featured')
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [writing, setWriting] = useState(false)

  if (error) return null
  const reviews = data?.data || []
  const { average = 0, count = 0 } = data?.summary || {}
  const animate = reviews.length >= 4

  const startWriting = () => (isAuthenticated ? setWriting(true) : navigate('/auth/login', { state: { from: location } }))

  return (
    <section className="py-14" aria-labelledby="reviews-title">
      <div className="container-page flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-200">Testimonials</p>
          <h2 id="reviews-title" className="mt-1 text-2xl font-bold sm:text-3xl">Loved by makers</h2>
          {count > 0 && <p className="mt-3 flex items-center gap-3"><span className="text-4xl font-extrabold">{average.toFixed(1)}</span><span><Stars value={average} size="text-lg" /><span className="block text-xs text-white/60">from {count} review{count === 1 ? '' : 's'}</span></span></p>}
        </div>
        <button type="button" onClick={startWriting} className="btn btn-primary"><MessageSquarePlus size={18} /> Write a review</button>
      </div>

      {reviews.length === 0 ? (
        <div className="container-page mt-8">
          <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-6 py-12 text-center">
            <p className="font-semibold">No reviews yet</p>
            <p className="mt-1 text-sm text-white/60">Bought something? Be the first to tell others what you think.</p>
          </div>
        </div>
      ) : animate ? (
        <div className="marquee mt-8" aria-label="Customer reviews">
          <ul className="marquee-track">
            {[...reviews, ...reviews].map((review, index) => (
              <li key={`${review.id}-${index}`} inert={index >= reviews.length} className="py-2"><ReviewCard review={review} /></li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="container-page mt-8 flex flex-wrap justify-center gap-5">
          {reviews.map((review) => <li key={review.id}><ReviewCard review={review} /></li>)}
        </ul>
      )}
      {writing && <WriteReview onClose={() => setWriting(false)} />}
    </section>
  )
}
