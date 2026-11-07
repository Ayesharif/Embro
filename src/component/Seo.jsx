import { Helmet } from 'react-helmet-async'
import { site } from '../config/site'

export default function Seo({
  title,
  description,
  canonical,
  image,
  type = 'website',
  robots = 'index,follow',
  jsonLd,
}) {
  const pageTitle = title ? `${title} | ${site.name}` : `${site.name} - Craft supplies for creative people`
  const canonicalUrl = new URL(canonical || window.location.pathname, site.url).toString()
  const imageUrl = image ? new URL(image, site.url).toString() : ''
  const schemas = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  return (
    <Helmet>
      <title>{pageTitle}</title>
      {description && <meta name="description" content={description.slice(0, 160)} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={pageTitle} />
      {description && <meta property="og:description" content={description.slice(0, 200)} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={pageTitle} />
      {description && <meta name="twitter:description" content={description.slice(0, 200)} />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      {schemas.map((schema, index) => <script key={index} type="application/ld+json">{JSON.stringify(schema)}</script>)}
    </Helmet>
  )
}
