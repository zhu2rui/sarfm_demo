const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Port 3000 is working!');
});

server.listen(3000, 'localhost', () => {
  console.log('Server running at http://localhost:3000/');
  console.log('Testing if port 3000 is available...');
  
  // Keep server running for 5 seconds, then close
  setTimeout(() => {
    console.log('Closing test server...');
    server.close(() => {
      console.log('Test server closed. Port 3000 is now available.');
    });
  }, 5000);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port 3000 is still in use!');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
