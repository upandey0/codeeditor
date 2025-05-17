import { io } from 'socket.io-client';

// Socket.io client for real-time code execution
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.sessionId = null;
    this.eventHandlers = {
      'execution-result': [],
      'execution-error': [],
      'input-required': [],
      'connect': [],
      'disconnect': []
    };
  }

  // Initialize socket connection
  connect(serverUrl = import.meta.env.VITE_WSS_URL) {
    if (this.socket) {
      return Promise.resolve(this.socket);
    }

    return new Promise((resolve, reject) => {
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.isConnected = true;
        this._triggerEvent('connect');
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        this._triggerEvent('disconnect', reason);
      });

      // Handle execution result
      this.socket.on('execution-result', (result) => {
        console.log('Execution result received:', result);
        this._triggerEvent('execution-result', result);
      });

      // Handle execution error
      this.socket.on('execution-error', (error) => {
        console.error('Execution error:', error);
        this._triggerEvent('execution-error', error);
      });

      // Handle input requests
      this.socket.on('input-required', (data) => {
        console.log('Input required:', data);
        this.sessionId = data.sessionId;
        this._triggerEvent('input-required', data);
      });
    });
  }

  // Trigger event handlers
  _triggerEvent(eventName, data) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach(handler => handler(data));
    }
  }

  // Add event listener
  on(eventName, callback) {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    this.eventHandlers[eventName].push(callback);

    // Return an unsubscribe function
    return () => {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        handler => handler !== callback
      );
    };
  }

  // Remove event listener
  off(eventName, callback) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(
        handler => handler !== callback
      );
    }
  }

  // Send code for execution
  executeCode(code, language) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      const resultHandler = (result) => {
        this.off('execution-result', resultHandler);
        this.off('execution-error', errorHandler);
        resolve(result);
      };

      const errorHandler = (error) => {
        this.off('execution-result', resultHandler);
        this.off('execution-error', errorHandler);
        reject(error);
      };

      this.on('execution-result', resultHandler);
      this.on('execution-error', errorHandler);
      
      this.socket.emit('execute-code', { code, language });
    });
  }

  // Provide input to running code
  provideInput(sessionId, input) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    console.log(`Providing input for session ${sessionId}:`, input);
    this.socket.emit('provide-input', {
      sessionId,
      input
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.sessionId = null;
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;