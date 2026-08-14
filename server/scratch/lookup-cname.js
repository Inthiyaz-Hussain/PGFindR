import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function lookup() {
  const host = 'db.eqoipazlemmsleqnkzfg.supabase.co';
  console.log(`Resolving CNAME for ${host}...`);
  dns.resolveCname(host, (err, addresses) => {
    if (err) {
      console.log('CNAME lookup failed:', err.message || err);
      // Fallback: Resolve any DNS records
      dns.resolve(host, 'ANY', (err2, records) => {
        if (err2) {
          console.log('ANY lookup failed:', err2.message || err2);
        } else {
          console.log('ANY records:', records);
        }
      });
    } else {
      console.log('CNAME addresses:', addresses);
    }
  });
}

lookup();
