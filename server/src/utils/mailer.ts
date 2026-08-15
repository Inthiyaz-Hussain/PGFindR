import nodemailer from 'nodemailer'

let transporterInstance: nodemailer.Transporter | null = null

/**
 * Sends a real email using Nodemailer if SMTP credentials are configured in .env.
 * Falls back gracefully to console log simulation if credentials are missing.
 */
export async function sendMail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('\n⚠️ SMTP credentials not fully configured in .env. Skipping real email dispatch.')
    console.warn('To enable real emails, please set the following variables in server/.env & .env at workspace root:')
    console.warn('  SMTP_HOST=smtp.gmail.com')
    console.warn('  SMTP_PORT=587')
    console.warn('  SMTP_USER=your-email@gmail.com')
    console.warn('  SMTP_PASS=your-app-password')
    console.warn('  SMTP_FROM="SwiftPG Admin" <your-email@gmail.com>\n')
    return false
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
        pool: true, // Enable connection pooling
        maxConnections: 3, // Keep up to 3 open connections
        maxMessages: 100, // Close connection after 100 messages
      })
    }

    const info = await transporterInstance.sendMail({
      from: process.env.SMTP_FROM || `"SwiftPG Admin" <${smtpUser}>`,
      to,
      subject,
      html: htmlContent,
    })

    console.log(`✅ Email sent successfully to ${to}! MessageId: ${info.messageId}`)
    return true
  } catch (err: any) {
    console.error(`❌ Failed to send email to ${to}:`, err.message || err)
    // If there is an authentication or network error, reset the transporter instance so it recreates on next attempt
    transporterInstance = null
    return false
  }
}

