require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { setupSocketHandlers } = require('./services/socket-service');
const { setupExpressRoutes } = require('./routes');

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Temporary directory for code files
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Setup Socket.io event handlers
setupSocketHandlers(io);

// Setup Express routes
setupExpressRoutes(app);

// Start the server
server.listen(PORT, () => {
  console.log(`CodeBuddy Junior backend running on port ${PORT}`);
});

module.exports = { app, server, io };
