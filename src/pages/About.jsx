import { Heart, Leaf, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../component/PageHeader'
import Seo from '../component/Seo'
import { site } from '../config/site'
import { organizationSchema } from '../utils/seoSchemas'

const values = [
  { icon: Sparkles, title: 'Quality first', text: 'We choose materials that feel good in your hands and hold up to your best work.' },
  { icon: Heart, title: 'Made for makers', text: 'From first-time crafters to seasoned creators, we stock what your next idea needs.' },
  { icon: Leaf, title: 'Thoughtful sourcing', text: 'We work with suppliers who care about how their products are made.' },
]

export default function About() {
  return (
    <>
      <Seo title="About us" description={site.tagline} jsonLd={organizationSchema()} />
      <PageHeader title="About us" crumbs={[{ label: 'About' }]} />
      <section className="container-page py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Craft supplies with a little more care</h2>
          <p className="mt-5 leading-7 text-white/75">{site.name} brings together yarn, beads and threads in colours and textures that make creating a joy. {site.tagline}</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="panel p-6">
              <Icon className="text-cyan-200" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/products" className="btn btn-primary">Explore the collection</Link>
        </div>
      </section>
    </>
  )
}
