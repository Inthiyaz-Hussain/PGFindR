import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMAIL = 'inthiyazhussain69@gmail.com';
const MOBILE = '6302854691';

async function run() {
  try {
    console.log('1. Fetching user by email to delete from auth...');
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', EMAIL);

    if (profileErr) throw profileErr;

    for (const p of profiles) {
      console.log(`Deleting auth user: ${p.id}`);
      const { error: delUserErr } = await supabase.auth.admin.deleteUser(p.id);
      if (delUserErr) console.error('Error deleting user:', delUserErr.message);
    }

    console.log('2. Deleting existing inquiries...');
    await supabase.from('owner_inquiries').delete().or(`email.eq.${EMAIL},mobile.eq.${MOBILE}`);
    await supabase.from('owner_inquiries').delete().eq('pg_whatsapp_number', MOBILE);

    console.log('3. Creating new inquiry...');
    const { data: inquiry, error: insertErr } = await supabase
      .from('owner_inquiries')
      .insert({
        full_name: 'Inthiyaz Hussain',
        mobile: MOBILE,
        email: EMAIL,
        google_uid: 'dummy-uid-for-testing',
        pg_name: 'Test Live PG',
        pg_city: 'Bengaluru',
        pg_address: '123 Live Testing St, Bengaluru - 560001',
        room_count: 5,
        bed_count: 10,
        referral_source: 'Testing',
        status: 'pending_admin_review'
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    console.log(`Inquiry created with ID: ${inquiry.id}`);

    console.log('4. Simulating Approval...');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error: updateErr } = await supabase
      .from('owner_inquiries')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reset_token: token,
        reset_token_expires_at: expiresAt.toISOString(),
        reset_token_used: false
      })
      .eq('id', inquiry.id);

    if (updateErr) throw updateErr;

    const setPasswordUrl = `https://findpgr.vercel.app/owner/set-password?token=${token}`;
    console.log(`Generated Password Link: ${setPasswordUrl}`);

    console.log('5. Triggering N8N Webhook...');
    if (webhookUrl) {
      const payload = {
        ownerName: inquiry.full_name,
        pgName: inquiry.pg_name,
        phoneNumber: MOBILE,
        setPasswordUrl: setPasswordUrl
      };
      
      console.log('Sending payload:', payload);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        console.error('Webhook failed:', res.status);
      } else {
        console.log('Webhook triggered successfully!');
      }
    } else {
      console.warn('No N8N_WHATSAPP_WEBHOOK_URL found in .env');
    }

    console.log('\n--- SUCCESS ---');
    console.log('Done! User should receive a WhatsApp message now.');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
