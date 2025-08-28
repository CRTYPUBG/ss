// Health check script for Shadowverse application
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('Shadowverse application is running correctly!');
  } else {
    console.log('There might be an issue with the application');
  }
});

req.on('error', (error) => {
  console.error('Error connecting to Shadowverse application:', error.message);
  console.log('The application might not be running or there is a network issue');
});

req.end();