const fetch = require('node-fetch');

(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/merchant/merchants', {
      headers: {
        'Cookie': 'your_auth_cookie_here'
      }
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
