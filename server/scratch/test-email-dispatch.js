import dotenv from 'dotenv'
import path from 'path'
import { sendMail } from '../src/utils/mailer.js'

dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') })

console.log('Testing email dispatch using SMTP config:')
console.log('SMTP_HOST:', process.env.SMTP_HOST)
console.log('SMTP_PORT:', process.env.SMTP_PORT)
console.log('SMTP_USER:', process.env.SMTP_USER)

const testRecipient = 'inthiyazhussain69@gmail.com'

async function runTest() {
  const success = await sendMail(
    testRecipient,
    'FindPGRoom - SMTP Connection Diagnostic Test',
    '<h3>If you see this, your SMTP configuration is fully working!</h3>'
  )
  if (success) {
    console.log('🎉 TEST SUCCESSFUL! Email sent.')
  } else {
    console.error('❌ TEST FAILED!')
  }
}

runTest()
