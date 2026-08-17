import rateLimit from 'express-rate-limit'

// Sensitive route: Login, Registration, OTP Verification
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login/register requests per windowMs
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Sensitive route: Initiating and verifying payments
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 payment requests per windowMs
  message: {
    error: 'Too many payment attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
