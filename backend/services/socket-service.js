// services/socket-service.js
const { v4: uuidv4 } = require('uuid');
const { executeCodeWithSocket } = require('./code-execution');

// Map to store active execution sessions
const activeSessions = new Map();

// Setup Socket.io event handlers
const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    // Handle code execution request
    socket.on('execute-code', async (data) => {
      const { code, language } = data;
      
      if (!code || !language) {
        socket.emit('execution-error', { error: 'Code and language are required' });
        return;
      }
      
      const sessionId = uuidv4();
      
      // Store session information
      activeSessions.set(sessionId, {
        socketId: socket.id,
        language,
        status: 'running',
        inputQueue: [],
        waitingForInput: false
      });
      
      try {
        // Execute code with Socket.io for input handling
        await executeCodeWithSocket(code, language, sessionId, socket);
        
        // Clean up session
        activeSessions.delete(sessionId);
      } catch (error) {
        console.error('Error executing code:', error);
        socket.emit('execution-error', { error: 'Server error during execution' });
        activeSessions.delete(sessionId);
      }
    });
    
    // Handle input from client
    socket.on('provide-input', (data) => {
      const { sessionId, input } = data;
      
      const session = activeSessions.get(sessionId);
      if (!session) {
        socket.emit('execution-error', { error: 'Session not found' });
        return;
      }
      
      if (session.waitingForInput) {
        // Session is waiting for input, resolve the promise
        if (session.inputResolver) {
          session.inputResolver(input);
          session.waitingForInput = false;
          session.inputResolver = null;
        }
      } else {
        // Queue the input for later use
        session.inputQueue.push(input);
      }
    });
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Clean up any sessions for this socket
      for (const [sessionId, session] of activeSessions.entries()) {
        if (session.socketId === socket.id) {
          // Terminate any pending input requests
          if (session.inputResolver) {
            session.inputResolver(null); // Resolve with null to signal termination
          }
          activeSessions.delete(sessionId);
        }
      }
    });
  });
  
  return {
    // Function to request input from client
    requestInput: async (sessionId, prompt) => {
      const session = activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      const socket = io.sockets.sockets.get(session.socketId);
      if (!socket) {
        throw new Error('Socket not found');
      }
      
      // Check if there's already queued input
      if (session.inputQueue.length > 0) {
        return session.inputQueue.shift();
      }
      
      // Create a promise that will be resolved when input is received
      const inputPromise = new Promise((resolve) => {
        session.waitingForInput = true;
        session.inputResolver = resolve;
        
        // Emit event to request input from client
        socket.emit('input-required', { sessionId, prompt });
        
        // Set timeout for input
        setTimeout(() => {
          if (session.waitingForInput) {
            resolve(null); // Resolve with null if timeout
            session.waitingForInput = false;
            session.inputResolver = null;
            socket.emit('execution-error', { error: 'Input timeout' });
          }
        }, 30000); // 30 seconds timeout
      });
      
      return inputPromise;
    }
  };
};

module.exports = { setupSocketHandlers };