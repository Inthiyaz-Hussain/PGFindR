import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import path from 'path'

let transporterInstance: nodemailer.Transporter | null = null

/**
 * Sends a real email using Nodemailer if SMTP credentials are configured in .env.
 * Falls back gracefully to console log simulation if credentials are missing.
 */
export async function sendMail(to: string, subject: string, htmlContent: string): Promise<{ success: boolean; error?: string }> {
  // Reload env in case process was started before SMTP credentials were added
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') })
    dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') })
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  console.log('[MAILER DEBUG] Attempting to send email:', {
    to,
    subject,
    smtpHost,
    smtpUser,
    hasPass: !!smtpPass
  })

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('\n⚠️ SMTP credentials not fully configured in .env. Skipping real email dispatch.')
    console.warn('To enable real emails, please set the following variables in server/.env & .env at workspace root:')
    console.warn('  SMTP_HOST=smtp.gmail.com')
    console.warn('  SMTP_PORT=587')
    console.warn('  SMTP_USER=your-email@gmail.com')
    console.warn('  SMTP_PASS=your-app-password')
    console.warn('  SMTP_FROM="FindPGRoom Admin" <your-email@gmail.com>\n')
    // Return true for simulation mode so the onboarding flow doesn't break when SMTP isn't configured.
    return { success: true }
  }

  try {
    if (!transporterInstance) {
      transporterInstance = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        family: 4, // Force IPv4 to prevent ENETUNREACH on IPv6 networks
      } as any)
    }

    const info = await transporterInstance.sendMail({
      from: process.env.SMTP_FROM || `"FindPGRoom Admin" <${smtpUser}>`,
      to,
      subject,
      html: htmlContent,
    })

    console.log(`✅ Email sent successfully to ${to}! MessageId: ${info.messageId}`)
    return { success: true }
  } catch (err: any) {
    const errorMessage = err.message || String(err)
    console.error(`❌ Failed to send email to ${to}:`, errorMessage)
    // If there is an authentication or network error, reset the transporter instance so it recreates on next attempt
    transporterInstance = null
    return { success: false, error: errorMessage }
  }
}

