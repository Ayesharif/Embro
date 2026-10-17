import { Helmet } from 'react-helmet-async'
import { site } from '../config/site'

export default function Seo({ title, description }) {
  return (
    <Helmet>
      <title>{title ? `${title} | ${site.name}` : `${site.name} - Craft supplies for creative people`}</title>
      {description && <meta name="description" content={description} />}
    </Helmet>
  )
}
