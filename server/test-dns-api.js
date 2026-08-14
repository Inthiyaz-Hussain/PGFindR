import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

dns.resolve4('eqoipazlemmsleqnkzfg.supabase.co', (err, addresses) => {
  if (err) {
    console.error('IPv4 resolution failed:', err);
  } else {
    console.log('IPv4 addresses:', addresses);
  }
});
