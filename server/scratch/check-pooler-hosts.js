import dns from 'dns';
import pg from 'pg';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const prefixes = ['aws-0', 'aws-1', 'aws-2', 'aws-3', 'aws-4'];
const regions = [
  'ap-northeast-1', // Tokyo
  'ap-southeast-1', // Singapore
  'ap-south-1',     // Mumbai
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1'
];

async function probe() {
  const username = 'postgres.eqoipazlemmsleqnkzfg';
  const password = 'Inthiyaz@7148';
  
  for (const region of regions) {
    for (const prefix of prefixes) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      
      // Check if host resolves first
      const ip = await new Promise((resolve) => {
        dns.resolve4(host, (err, addresses) => {
          if (err || !addresses || addresses.length === 0) {
            resolve(null);
          } else {
            resolve(addresses[0]);
          }
        });
      });
      
      if (!ip) continue;
      
      console.log(`Host ${host} resolves to ${ip}. Trying to connect...`);
      
      // Try connection on port 5432 and 6543
      for (const port of [5432, 6543]) {
        const connectionString = `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
        const client = new pg.Client({
          connectionString,
          ssl: { rejectUnauthorized: false }
        });
        
        try {
          await client.connect();
          console.log(`\n🎉 SUCCESS! Connected to ${host}:${port} successfully!\n`);
          await client.end();
          return;
        } catch (err) {
          console.log(`Failed for ${host}:${port} (${err.code || 'unknown'}): ${err.message}`);
          try {
            await client.end();
          } catch (e) {}
        }
      }
    }
  }
  console.log('Finished probing all resolved pooler hosts.');
}

probe();
