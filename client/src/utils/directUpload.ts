const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface DirectUploadResult {
  fileUrl?: string
  key: string
  kycId?: string
}

export async function uploadFileToR2(
  file: File,
  token: string,
  options: {
    isKyc?: boolean
    docType?: string
    propertyId?: string
    customKey?: string
    onProgress?: (progress: number) => void
  } = {}
): Promise<DirectUploadResult> {
  const { isKyc = false, docType, propertyId, customKey, onProgress } = options

  // 1. Get presigned upload URL from server API
  let uploadUrl = ''
  let fileUrl = ''
  let key = ''
  let kycId = ''

  if (isKyc) {
    if (!docType) {
      throw new Error('docType is required for KYC uploads')
    }

    const response = await fetch(`${API_URL}/api/kyc/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ docType }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to generate KYC upload URL')
    }

    const data = await response.json()
    uploadUrl = data.uploadUrl
    key = data.key
    kycId = data.kycId
  } else {
    // Media Upload
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uniqueKey = customKey || `media/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const response = await fetch(`${API_URL}/api/media/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key: uniqueKey, contentType: file.type }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to generate media upload URL')
    }

    const data = await response.json()
    uploadUrl = data.uploadUrl
    fileUrl = data.fileUrl
    key = uniqueKey
  }

  // 2. Perform direct PUT upload to Cloudflare R2 with progress tracking using XMLHttpRequest
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type)

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(percentComplete)
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve()
      } else {
        reject(new Error(`Failed to upload file to storage. HTTP Status: ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error during file upload to R2'))
    }

    xhr.send(file)
  })

  // 3. Confirm media uploads to save metadata in DB
  if (!isKyc && propertyId) {
    const fileType = file.type.startsWith('video/') ? 'video' : 'image'
    const response = await fetch(`${API_URL}/api/media/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        property_id: propertyId,
        file_url: fileUrl,
        file_type: fileType,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to confirm media upload in DB')
    }

    const confirmedData = await response.json()
    return {
      fileUrl: confirmedData.file_url,
      key,
    }
  }

  return {
    fileUrl,
    key,
    kycId,
  }
}
