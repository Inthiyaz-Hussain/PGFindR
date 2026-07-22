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
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseKey)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

app.use('/api/auth', authRoutes)
app.use('/api/pg', pgRoutes)
app.use('/api/pgs', pgsRoutes)
app.use('/api/inquiry', inquiryRoutes)
app.use('/api/booking', bookingRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/webhook', webhookRoutes)
app.use('/api/notifications', notificationRoutes)

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: 'Internal server error', message: err.message })
})

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

if (process.env.NODE_ENV !== 'test') {
  let currentPort = Number(PORT) || 3001

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
