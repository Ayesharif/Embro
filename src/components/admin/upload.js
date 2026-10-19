import { apiRequest } from '../../utils/api'

// Uploads straight from the browser to Cloudinary using a short-lived signature from our API,
// so the API secret never leaves the server.
export async function uploadImage(file, folder = 'lembro/products') {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 8 * 1024 * 1024) throw new Error('Images must be smaller than 8 MB.')
  const signature = await apiRequest('/uploads/signature', { method: 'POST', body: { folder } })
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signature.apiKey)
  form.append('timestamp', String(signature.timestamp))
  form.append('folder', signature.folder)
  form.append('allowed_formats', signature.allowedFormats)
  form.append('signature', signature.signature)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: 'POST', body: form })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.message || 'Image upload failed.')
  return { publicId: result.public_id, secureUrl: result.secure_url, altText: '' }
}
