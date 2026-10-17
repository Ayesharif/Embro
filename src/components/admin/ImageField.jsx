import { ImagePlus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Notice, Spinner } from '../../component/States'
import { uploadImage } from './upload'

// Single-image picker. The file goes straight to Cloudinary; the form keeps the returned
// { publicId, secureUrl } and the API stores that in the database when the form is saved.
export default function ImageField({ label = 'Image', value, onChange, folder, hint }) {
  const inputId = useId()
  const [state, setState] = useState({ uploading: false, error: '' })

  const pick = async (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    setState({ uploading: true, error: '' })
    try {
      const { publicId, secureUrl } = await uploadImage(file, folder)
      onChange({ publicId, secureUrl })
      setState({ uploading: false, error: '' })
    } catch (error) {
      setState({ uploading: false, error: error.message })
    }
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/30 bg-white/5">
          {value?.secureUrl ? <img src={value.secureUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="text-white/40" aria-hidden="true" />}
          {state.uploading && <span className="absolute inset-0 flex items-center justify-center bg-black/60"><Spinner /></span>}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <label htmlFor={inputId} className={`btn btn-outline btn-sm cursor-pointer ${state.uploading ? 'pointer-events-none opacity-50' : ''}`}>
              {value?.secureUrl ? 'Replace image' : 'Upload image'}
            </label>
            <input id={inputId} type="file" accept="image/*" className="sr-only" disabled={state.uploading} onChange={pick} />
            {value?.secureUrl && <button type="button" onClick={() => onChange(null)} className="btn btn-danger btn-sm"><Trash2 size={14} /> Remove</button>}
          </div>
          <p className="text-xs text-white/50">{hint || 'JPG, PNG, WebP or AVIF, up to 8 MB. Stored on Cloudinary.'}</p>
        </div>
      </div>
      <div className="mt-2"><Notice>{state.error}</Notice></div>
    </div>
  )
}
