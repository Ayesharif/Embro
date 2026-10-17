export default function Stars({ value = 0, count, size = 'text-base' }) {
  const rounded = Math.round(value)
  return (
    <span className={`inline-flex items-center gap-2 ${size}`} role="img" aria-label={count ? `Rated ${value} out of 5 from ${count} reviews` : 'No reviews yet'}>
      <span className="tracking-wide" aria-hidden="true">
        <span className="text-amber-400">{'★'.repeat(rounded)}</span>
        <span className="text-white/25">{'★'.repeat(5 - rounded)}</span>
      </span>
      {count > 0 && <span className="text-xs text-white/60">({count})</span>}
    </span>
  )
}
