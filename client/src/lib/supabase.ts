import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://eqoipazlemmsleqnkzfg.supabase.co') as string
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxb2lwYXpsZW1tc2xlcW5remZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3ODQyMjQsImV4cCI6MjA5NzM2MDIyNH0.J8N54JnBBPLf9wPK4fb_5TPJF_qyD06o73NQ4FtC0mQ') as string

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  auth: { flowType: 'implicit' },
})

// Untyped client for dynamic table access
export const supabaseUntyped = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
})

// Client-side image compression using canvas
export async function compressImage(file: File, maxSizeBytes: number = 5 * 1024 * 1024): Promise<File> {
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if dimensions are extremely large
        const maxDimension = 1920;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context for compression'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const getBlob = (q: number): Promise<Blob | null> => {
          return new Promise((res) => {
            canvas.toBlob((b) => res(b), 'image/jpeg', q);
          });
        };

        const tryCompress = async (q: number): Promise<Blob> => {
          const blob = await getBlob(q);
          if (!blob) {
            throw new Error('Image export failed');
          }
          if (blob.size > maxSizeBytes && q > 0.3) {
            return tryCompress(q - 0.2);
          }
          return blob;
        };

        tryCompress(quality)
          .then((compressedBlob) => {
            const name = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpeg';
            const compressedFile = new File([compressedBlob], name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          })
          .catch(reject);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
    };
    reader.onerror = () => reject(new Error('Failed to read file for compression'));
  });
}

// Ensure the storage bucket exists on Supabase (safely handled client-side if permissions allow)
export async function ensureBucketExists(bucketName: string = 'pg-images') {
  try {
    const { data, error } = await supabase.storage.getBucket(bucketName)
    if (error || !data) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      })
      if (createError) {
        console.warn(`Could not create bucket ${bucketName} client-side (this is expected if policies restrict bucket creation):`, createError.message)
      } else {
        console.log(`Bucket ${bucketName} created successfully client-side.`)
      }
    }
  } catch (err: any) {
    console.warn(`Error checking/creating bucket ${bucketName} client-side:`, err.message || err)
  }
}

