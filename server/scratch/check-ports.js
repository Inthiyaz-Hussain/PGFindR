import http from 'http';

function checkPort(port, name) {
  return new Promise((resolve) => {
    const req = http.request({
      host: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      console.log(`Port ${port} (${name}) is LISTENING (Status: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', () => {
      console.log(`Port ${port} (${name}) is NOT listening.`);
      resolve(false);
    });

    req.end();
  });
}

async function run() {
  await checkPort(5173, 'Client Vite Server');
  await checkPort(3001, 'Backend Express Server');
}

run();
