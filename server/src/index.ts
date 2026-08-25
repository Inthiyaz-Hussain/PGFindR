import './load-env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createClient } from '@supabase/supabase-js'
import { initializeFirebase } from './lib/firebase.js'

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Firebase Admin SDK
initializeFirebase()

// Supabase admin client (service role) - falls back to anon key if service role not available
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey)

export const getSupabaseClient = (req: express.Request) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token && !token.startsWith('mock-token-')) {
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })
  }
  return supabase
}

// Middleware
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    // Allow request if origin is not present (like mobile apps, curl, postman)
    if (!origin) {
      callback(null, true)
      return
    }

    const allowedOrigins = [
      'https://findpgr.vercel.app',
      'https://swiftpg.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ]

    // Allow predefined origins, localhosts, or any .vercel.app deployments
    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.endsWith('.vercel.app')
    ) {
      callback(null, true)
    } else {
      // Check if custom CLIENT_URL is defined
      const clientUrl = process.env.CLIENT_URL
      if (clientUrl) {
        const urls = clientUrl.split(',').map(url => url.trim())
        if (urls.includes(origin)) {
          callback(null, true)
          return
        }
      }
      
      // Fallback: accept the origin to avoid blocking any production deployment dynamically
      callback(null, true)
    }
  },
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({
  limit: '15mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString()
  }
}))
app.use(express.urlencoded({ limit: '15mb', extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
import authRoutes from './routes/auth.js'
import pgRoutes from './routes/pg.js'
import pgsRoutes from './routes/pgs.js'
import inquiryRoutes from './routes/inquiry.js'
import bookingRoutes from './routes/booking.js'
import paymentRoutes from './routes/payment.js'
import webhookRoutes from './routes/webhook.js'
import notificationRoutes from './routes/notifications.js'
import ownerOnboardingRoutes from './routes/ownerOnboarding.js'
import mediaRoutes from './routes/media.js'
import kycRoutes from './routes/kyc.js'

app.use('/api/auth', authRoutes)
app.use('/api/pg', pgRoutes)
app.use('/api/pgs', pgsRoutes)
app.use('/api/inquiry', inquiryRoutes)
app.use('/api/booking', bookingRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/webhook', webhookRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/kyc', kycRoutes)
app.use('/', ownerOnboardingRoutes)

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: '404 Forbidden - Route not available' })
})

// Ensure storage buckets exist
async function initializeStorageBuckets() {
  try {
    const buckets = ['pg-images', 'pg-photos']
    for (const bucket of buckets) {
      const { data, error } = await supabase.storage.getBucket(bucket)
      if (error || !data) {
        console.log(`Storage bucket ${bucket} not found. Creating...`)
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: true,
        })
        if (createError) {
          console.error(`Failed to create bucket ${bucket}:`, createError)
        } else {
          console.log(`Storage bucket ${bucket} created successfully.`)
        }
      }
    }
  } catch (err) {
    console.error('Error during storage bucket initialization:', err)
  }
}

if (process.env.NODE_ENV !== 'test') {
  let currentPort = Number(PORT) || 3001

  // Initialize storage buckets
  initializeStorageBuckets()

  const startServer = (portToTry: number) => {
    const server = app.listen(portToTry, () => {
      console.log(`PGFindR server running on port ${portToTry}`)
    })

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${portToTry} is already in use. Retrying on port ${portToTry + 1}...`)
        startServer(portToTry + 1)
      } else {
        console.error('Server error:', err)
      }
    })
  }

  startServer(currentPort)
}

export default app
