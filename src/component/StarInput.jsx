import { Star } from 'lucide-react'
import { useState } from 'react'

const labels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

// Accessible star picker: hover to preview, click or use arrow keys to choose.
export default function StarInput({ value, onChange, size = 34 }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value

  const onKeyDown = (event) => {
    if (['ArrowRight', 'ArrowUp'].includes(event.key)) { event.preventDefault(); onChange(Math.min(5, (value || 0) + 1)) }
    if (['ArrowLeft', 'ArrowDown'].includes(event.key)) { event.preventDefault(); onChange(Math.max(1, (value || 2) - 1)) }
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)} onKeyDown={onKeyDown} className="inline-flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''} - ${labels[star]}`}
            tabIndex={value === star || (!value && star === 1) ? 0 : -1}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95"
          >
            <Star size={size} strokeWidth={1.5} className={`transition-colors ${star <= shown ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-semibold text-amber-300" aria-live="polite">{labels[shown] || 'Tap a star to rate'}</p>
    </div>
  )
}
