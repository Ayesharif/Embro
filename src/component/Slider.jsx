import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import banner1 from '../assets/banner.png'
import banner2 from '../assets/banner1.png'
import banner3 from '../assets/banner2.png'

const slides = [
  { image: banner1, eyebrow: 'Made for makers', title: 'Beautiful yarn for every project', description: 'Soft textures, rich colours and everything you need to create something special.', to: '/products?category=yarn' },
  { image: banner2, eyebrow: 'Add a little sparkle', title: 'Beads that bring ideas to life', description: 'Discover colourful beads and accessories for your next handmade collection.', to: '/products?category=beads' },
  { image: banner3, eyebrow: 'New season colours', title: 'Find your perfect thread', description: 'A playful palette of premium threads, ready for your next creative project.', to: '/products?category=threads' },
]

export default function Slider() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const show = (index) => setActive((index + slides.length) % slides.length)

  useEffect(() => {
    if (paused) return undefined
    const timer = setInterval(() => setActive((current) => (current + 1) % slides.length), 6000)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <section className="relative w-full overflow-hidden text-white" aria-roledescription="carousel" aria-label="Featured collections" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${active * 100}%)` }}>
        {slides.map((slide, index) => (
          <article key={slide.title} className="slide-background relative min-w-full" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`} inert={active !== index} style={{ '--slide-image': `url("${slide.image}")` }}>
            <div className="container-page flex min-h-[520px] items-start pb-44 pt-14 sm:items-center sm:py-16 lg:min-h-[600px]">
              <div className="absolute inset-0 bg-black/45 md:hidden" />
              <div className="relative z-10 max-w-xl">
                <p className="mb-3 text-base font-medium text-white/80 sm:text-2xl">{slide.eyebrow}</p>
                {index === 0 ? <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-6xl">{slide.title}</h1> : <h2 className="max-w-2xl text-3xl font-bold leading-tight sm:text-6xl">{slide.title}</h2>}
                <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-white/75 sm:text-lg">{slide.description}</p>
                <Link to={slide.to} className="btn btn-outline mt-8 uppercase tracking-wide">Shop now <span aria-hidden="true">❯</span></Link>
              </div>
              <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[45%] items-end justify-center md:flex lg:w-[42%]">
                <img src={slide.image} alt="" className="max-h-[85%] w-full object-contain object-bottom drop-shadow-2xl" />
              </div>
            </div>
          </article>
        ))}
      </div>
      {[['Previous slide', '‹', 'left-1 sm:left-5', -1], ['Next slide', '›', 'right-1 sm:right-5', 1]].map(([label, glyph, position, step]) => (
        <button key={label} type="button" aria-label={label} onClick={() => show(active + step)} className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-3xl text-white/80 transition hover:text-white ${position}`}><span aria-hidden="true">{glyph}</span></button>
      ))}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((slide, index) => (
          <button key={slide.title} type="button" aria-label={`Go to slide ${index + 1}`} aria-current={active === index ? 'true' : undefined} onClick={() => show(index)} className={`h-1.5 rounded transition-all ${active === index ? 'w-10 bg-white' : 'w-8 bg-white/40'}`} />
        ))}
      </div>
    </section>
  )
}
