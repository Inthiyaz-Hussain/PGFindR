import http from 'http';

function testEndpoint(path, method, body = null) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`\nEndpoint: ${method} ${path}`);
        console.log(`Response Status: ${res.statusCode}`);
        console.log(`Response Body: ${data}`);
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      console.error(`Error connecting to ${method} ${path}:`, err.message);
      resolve(null);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  console.log('Testing mounted routes on 127.0.0.1:3001...');
  
  // Test 1: Validate invalid token
  await testEndpoint('/api/owner/set-password?token=invalid_test_token', 'GET');
  
  // Test 2: Try submitting set-password with empty values
  await testEndpoint('/api/owner/set-password', 'POST', {
    token: 'some_token',
    password: '',
    confirmPassword: ''
  });
}

run();
