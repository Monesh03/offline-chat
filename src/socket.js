// src/socket.js
import { io } from 'socket.io-client';

// ✅ Replace with your backend server URL or IP address
const SOCKET_SERVER_URL = "http://172.20.10.9:8000"; // or http://localhost:8000 during development

export const socket = io(SOCKET_SERVER_URL, {
  transports: ['websocket'], // Works well for both web and mobile
  autoConnect: false,        // Prevent auto-connection (connect manually when needed)
});
