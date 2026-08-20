import React, { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Film, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { uploadFileToR2 } from '@/utils/directUpload'
import { toast } from 'sonner'

export type MediaType = 'room' | 'common' | 'exterior' | 'kitchen' | 'washroom'

export interface PropertyPhoto {
  url: string
  type: MediaType
  is_primary?: boolean
}

interface PropertyMediaUploaderProps {
  propertyId?: string
  photos: PropertyPhoto[]
  onChange: (photos: PropertyPhoto[]) => void
}

export function PropertyMediaUploader({
  propertyId,
  photos,
  onChange,
}: PropertyMediaUploaderProps) {
  const { session } = useAuth()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentFile, setCurrentFile] = useState('')
  const [progress, setProgress] = useState(0)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const processFiles = useCallback(
    async (files: FileList) => {
      if (!session?.access_token) {
        toast.error('You must be logged in to upload files')
        return
      }

      setUploading(true)
      const token = session.access_token

      try {
        const newPhotos: PropertyPhoto[] = []

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const isVideo = file.type.startsWith('video/')
          const isImage = file.type.startsWith('image/')

          if (!isImage && !isVideo) {
            toast.error(`File "${file.name}" is not a supported image or video format`)
            continue
          }

          if (file.size > 15 * 1024 * 1024) {
            toast.error(`File "${file.name}" exceeds the 15MB size limit`)
            continue
          }

          setCurrentFile(file.name)
          setProgress(0)

          const result = await uploadFileToR2(file, token, {
            propertyId,
            onProgress: (percent) => setProgress(Math.round(percent)),
          })

          if (result.fileUrl) {
            newPhotos.push({
              url: result.fileUrl,
              type: 'room',
            })
          }
        }

        if (newPhotos.length > 0) {
          onChange([...photos, ...newPhotos])
          toast.success(`Successfully uploaded ${newPhotos.length} media file(s)`)
        }
      } catch (err: any) {
        console.error('Upload handler error:', err)
        toast.error(`Upload failed: ${err.message || err}`)
      } finally {
        setUploading(false)
        setCurrentFile('')
        setProgress(0)
      }
    },
    [session, propertyId, photos, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files)
      }
    },
    [processFiles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault()
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files)
      }
    },
    [processFiles]
  )

  const removePhoto = useCallback(
    (indexToRemove: number) => {
      const updated = photos.filter((_, idx) => idx !== indexToRemove)
      onChange(updated)
    },
    [photos, onChange]
  )

  const updatePhotoType = useCallback(
    (indexToUpdate: number, type: MediaType) => {
      const updated = photos.map((p, idx) =>
        idx === indexToUpdate ? { ...p, type } : p
      )
      onChange(updated)
    },
    [photos, onChange]
  )

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-indigo-600 bg-indigo-50/10'
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50'
        }`}
      >
        <input
          type="file"
          id="media-file-upload"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />

        <label
          htmlFor="media-file-upload"
          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
        >
          <div className="p-3 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600">
            <Upload className="size-6 text-indigo-650" />
          </div>
          <div>
            <span className="font-semibold text-indigo-600 hover:underline">
              Click to upload
            </span>{' '}
            or drag and drop
          </div>
          <div className="text-xs text-muted-foreground">
            Support images and videos (Max 15MB per file)
          </div>
        </label>
      </div>

      {/* Uploading Status */}
      {uploading && (
        <div className="bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[250px] flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-indigo-600" />
              Uploading {currentFile}...
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Grid Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo, index) => {
            const isVideo =
              photo.url.endsWith('.mp4') ||
              photo.url.endsWith('.webm') ||
              photo.url.endsWith('.mov')

            return (
              <div
                key={photo.url}
                className="group relative border rounded-xl overflow-hidden bg-slate-900 dark:border-slate-800 aspect-video flex flex-col justify-between"
              >
                {/* Media Preview */}
                <div className="absolute inset-0 z-0">
                  {isVideo ? (
                    <video
                      src={photo.url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={photo.url}
                      alt={`Preview ${index}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-start justify-end p-2">
                  <Button
                    size="icon"
                    variant="destructive"
                    className="size-7 rounded-full"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Media Type Icon */}
                <div className="absolute bottom-2 left-2 z-10">
                  <Badge className="bg-black/60 hover:bg-black/60 text-white backdrop-blur border-0 gap-1 flex items-center text-[10px] px-1.5 py-0.5">
                    {isVideo ? (
                      <Film className="size-3" />
                    ) : (
                      <ImageIcon className="size-3" />
                    )}
                    {isVideo ? 'Video' : 'Photo'}
                  </Badge>
                </div>

                {/* Dropdown/Select for Location Type */}
                <div className="absolute bottom-2 right-2 z-10">
                  <select
                    value={photo.type}
                    onChange={(e) =>
                      updatePhotoType(index, e.target.value as MediaType)
                    }
                    className="text-[10px] bg-black/75 hover:bg-black/85 text-white border-0 rounded px-1.5 py-0.5 cursor-pointer outline-none font-medium backdrop-blur-sm"
                  >
                    <option value="room" className="bg-slate-900">
                      Room
                    </option>
                    <option value="common" className="bg-slate-900">
                      Common
                    </option>
                    <option value="exterior" className="bg-slate-900">
                      Exterior
                    </option>
                    <option value="kitchen" className="bg-slate-900">
                      Kitchen
                    </option>
                    <option value="washroom" className="bg-slate-900">
                      Washroom
                    </option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
