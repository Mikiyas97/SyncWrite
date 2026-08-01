import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  withCredentials: true
});

socket.on('connect', () => {
  console.log('Connected!');
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

socket.on('error', (err) => {
  console.error('Error:', err.message);
});

// simulate timeout
setTimeout(() => {
  console.log('Timeout');
  process.exit(1);
}, 3000);
