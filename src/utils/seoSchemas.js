import { site } from '../config/site'

const absoluteUrl = (value) => {
  if (!value) return site.url
  try {
    return new URL(value, site.url).toString()
  } catch {
    return site.url
  }
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.url,
    ...(site.logo ? { logo: absoluteUrl(site.logo) } : {}),
    ...(site.email ? { email: site.email } : {}),
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(site.instagram ? { sameAs: [site.instagram] } : {}),
  }
}
