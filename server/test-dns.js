import dns from 'dns';
dns.reverse('2406:da14:1772:ea00:1879:dcf2:86d2:809a', (err, hostnames) => {
  if (err) {
    console.error('DNS reverse lookup failed:', err);
  } else {
    console.log('Resolved hostnames:', hostnames);
  }
});
