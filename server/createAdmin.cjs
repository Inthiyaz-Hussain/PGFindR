require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const authUserId = 'b23ec372-6e6e-4dc6-aa64-2f62d537118c';
  const ghostId = '00000000-0000-0000-0000-000000000003';
  const password = 'Admin@7148';
  
  console.log('Cleaning up duplicate ghost profile...');
  await supabase.from('profiles').delete().eq('id', ghostId);

  console.log('Setting password...');
  const { error } = await supabase.auth.admin.updateUserById(authUserId, { password, email_confirm: true });
  
  if (error) {
     console.error('Error updating password:', error);
  } else {
     console.log('Password updated successfully for', authUserId);
  }
}

main();
