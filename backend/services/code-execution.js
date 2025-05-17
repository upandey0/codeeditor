// Alternative approach using sandboxed-module instead of Docker
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sanitizeInput } = require('../utils/sanitizer');

// Temporary directory for code files
const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Safe builtins and modules to allow
const SAFE_MODULES = {
  'fs': {
    readFileSync: (path, options) => {
      // Only allow reading from specific approved directories
      if (path.includes('../') || !path.startsWith('/tmp/')) {
        throw new Error('Access denied: Cannot read files outside allowed directories');
      }
      return fs.readFileSync(path, options);
    },
    writeFileSync: (path, data) => {
      // Only allow writing to specific approved directories
      if (path.includes('../') || !path.startsWith('/tmp/')) {
        throw new Error('Access denied: Cannot write files outside allowed directories');
      }
      return fs.writeFileSync(path, data);
    },
    existsSync: fs.existsSync,
    unlinkSync: (path) => {
      // Only allow deletion in specific approved directories
      if (path.includes('../') || !path.startsWith('/tmp/')) {
        throw new Error('Access denied: Cannot delete files outside allowed directories');
      }
      return fs.unlinkSync(path);
    }
  },
  'path': {
    join: path.join,
    resolve: path.resolve
  }
};

// Execute JavaScript in VM with Socket.io for user input
const executeJavaScriptWithSocket = async (code, sessionId, socket) => {
  // Sanitize the code
  const sanitizedCode = sanitizeInput(code);
  
  let stdout = '';
  let stderr = '';
  
  // Create request and input file paths
  const requestFile = path.join(TEMP_DIR, `input_request_${sessionId}.txt`);
  const inputFile = path.join(TEMP_DIR, `socket_input_${sessionId}.txt`);
  const receivedFile = path.join(TEMP_DIR, `input_received_${sessionId}.txt`);
  
  // Clean up any existing files
  [requestFile, inputFile, receivedFile].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
  
  // Prepare sandbox context
  const context = {
    console: {
      log: (...args) => {
        stdout += args.join(' ') + '\n';
        socket.emit('execution-output', { output: args.join(' ') + '\n' });
      },
      error: (...args) => {
        stderr += args.join(' ') + '\n';
        socket.emit('execution-error', { error: args.join(' ') + '\n' });
      }
    },
    prompt: async (message = "Input required:") => {
      // Write prompt to request file
      fs.writeFileSync(requestFile, message);
      
      // Request input from client via socket
      socket.emit('input-required', { sessionId, prompt: message });
      
      // Wait for input
      return new Promise((resolve) => {
        const handleInput = (data) => {
          if (data.sessionId === sessionId) {
            // Write input to file
            fs.writeFileSync(inputFile, data.input);
            
            // Remove listener after handling
            socket.removeListener('provide-input', handleInput);
            resolve(data.input);
          }
        };
        
        // Add listener for input response
        socket.on('provide-input', handleInput);
        
        // Set timeout for input
        setTimeout(() => {
          socket.removeListener('provide-input', handleInput);
          resolve("");
        }, 30000); // 30 seconds timeout
      });
    },
    setTimeout,
    clearTimeout,
    require: (moduleName) => {
      if (SAFE_MODULES[moduleName]) {
        return SAFE_MODULES[moduleName];
      }
      throw new Error(`Module '${moduleName}' is not allowed`);
    },
    Buffer,
    process: {
      env: {} // Empty environment
    }
  };
  
  // Add global variables to context
  Object.defineProperty(context, 'global', {
    value: context
  });
  
  try {
    // Create VM context
    const vmContext = vm.createContext(context);
    
    // Set execution timeout
    const executionTimeout = setTimeout(() => {
      socket.emit('execution-error', { 
        error: 'Program execution timed out (60 seconds limit).' 
      });
      stderr += 'Program execution timed out (60 seconds limit).';
    }, 60000);
    
    // Execute code in sandbox
    const script = new vm.Script(`
      (async () => {
        try {
          ${sanitizedCode}
        } catch (error) {
          console.error('Runtime error:', error.message);
        }
      })();
    `);
    
    // Run the script
    await script.runInContext(vmContext, { 
      timeout: 60000, // Additional timeout protection
      displayErrors: true
    });
    
    clearTimeout(executionTimeout);
    
  } catch (err) {
    stderr += 'Execution error: ' + err.message;
    socket.emit('execution-error', { error: 'Execution error: ' + err.message });
  } finally {
    // Clean up files
    [requestFile, inputFile, receivedFile].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }
  
  // Emit final result
  socket.emit('execution-result', { stdout, stderr });
  return { stdout, stderr };
};

// Execute Python with PyOdide (WebAssembly version of Python)
const executePythonWithSocket = async (code, sessionId, socket) => {
  // This would require integrating with PyOdide in the browser
  // Server just coordinates and handles input/output
  
  // For now, we'll use a placeholder that indicates this should be
  // handled client-side with PyOdide
  socket.emit('use-pyodide', { 
    code, 
    sessionId 
  });
  
  return { 
    stdout: "Execution handled by PyOdide in browser", 
    stderr: "" 
  };
};

// Main function to execute code
const executeCodeWithSocket = async (code, language, sessionId, socket) => {
  let result;

  if (language === 'python') {
    result = await executePythonWithSocket(code, sessionId, socket);
  } else if (language === 'javascript') {
    result = await executeJavaScriptWithSocket(code, sessionId, socket);
  } else {
    socket.emit('execution-error', { error: 'Unsupported language' });
    return;
  }

  // Emit final result
  socket.emit('execution-result', result);
};

module.exports = {
  executeCodeWithSocket
};