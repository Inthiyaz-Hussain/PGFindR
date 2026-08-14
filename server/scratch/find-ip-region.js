import fetch from 'node-fetch';
import ipaddr from 'ipaddr.js';

const targetIpStr = '2406:da14:1772:ea00:1879:dcf2:86d2:809a';
const targetIp = ipaddr.parse(targetIpStr);

async function findRegion() {
  try {
    console.log('Downloading AWS IP ranges...');
    const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const data = await res.json();
    console.log('AWS IP ranges downloaded. Processing ranges...');

    let matched = null;

    for (const prefix of data.ipv6_prefixes) {
      try {
        const cidr = ipaddr.parseCIDR(prefix.ipv6_prefix);
        if (targetIp.match(cidr)) {
          console.log(`Matched CIDR: ${prefix.ipv6_prefix} in region: ${prefix.region} for service: ${prefix.service}`);
          matched = prefix;
        }
      } catch (e) {
        // Skip invalid CIDRs
      }
    }

    if (!matched) {
      console.log('No AWS IPv6 prefix matched the target IP.');
    }
  } catch (err) {
    console.error('Error running region finder:', err);
  }
}

findRegion();
