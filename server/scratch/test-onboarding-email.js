import dotenv from 'dotenv'
import path from 'path'
import { sendMail } from '../src/utils/mailer.js'

dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') })

console.log('--- Testing Onboarding Email Send ---')
console.log('SMTP_USER:', process.env.SMTP_USER)

const emailSubject = `SwiftPG - Your Owner Account Has Been Approved - Set Your Password`
const setPasswordLink = `http://localhost:5173/owner/set-password?token=mocktoken12345`
const emailHtml = `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
    <h2>Hello Test Owner,</h2>
    <p>Your PG listing inquiry has been approved. Please click the button below to configure your password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${setPasswordLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block;">Set Your Password</a>
    </div>
  </div>
`

async function testSends() {
  const recipients = ['uzairis11tf@gmail.com', 'inthiyazhussain8779@gmail.com']
  for (const recipient of recipients) {
    console.log(`\nAttempting send to: ${recipient}...`)
    const success = await sendMail(recipient, emailSubject, emailHtml)
    console.log(`Result for ${recipient}: ${success ? '✅ SUCCESS' : '❌ FAILED'}`)
  }
}

testSends()
