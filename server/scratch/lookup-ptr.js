import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function reverse() {
  const ip = '2406:da14:1772:ea00:1879:dcf2:86d2:809a';
  console.log(`Resolving PTR for ${ip}...`);
  dns.reverse(ip, (err, hostnames) => {
    if (err) {
      console.log('PTR lookup failed:', err.message || err);
    } else {
      console.log('Hostnames:', hostnames);
    }
  });
}

reverse();
