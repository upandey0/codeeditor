// services/code-execution.js
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const docker = require('dockerode');
const { sanitizeInput } = require('../utils/sanitizer');
const { cleanupFile } = require('../utils/file-utils');

// Docker setup
const dockerClient = new docker();

// Temporary directory for code files
const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Execute code with Socket.io for runtime input
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

// Execute Python code using Docker with Socket.io for input
const executePythonWithSocket = async (code, sessionId, socket) => {
  const codePath = path.join(TEMP_DIR, `${sessionId}.py`);
  const socketHelperPath = path.join(TEMP_DIR, `${sessionId}_socket_helper.py`);

  // Sanitize the code for basic security
  const sanitizedCode = sanitizeInput(code);

  // Create a socket helper file that will communicate with our Node.js server
  const socketHelperCode = `
import sys
import os
import time

# This file acts as an input bridge between Python code and Node.js server
class SocketInputBridge:
    def __init__(self, session_id):
        self.session_id = session_id
        self.input_file = f"/tmp/socket_input_{session_id}.txt"
        self.request_file = f"/tmp/input_request_{session_id}.txt"
        self.received_file = f"/tmp/input_received_{session_id}.txt"
        
        # Clear any existing files
        for file_path in [self.input_file, self.request_file, self.received_file]:
            if os.path.exists(file_path):
                os.remove(file_path)
    
    def input(self, prompt=""):
        # Write prompt to request file to signal we need input
        with open(self.request_file, "w") as f:
            f.write(prompt or "Input required: ")
        
        # Wait for input to be provided
        start_time = time.time()
        timeout = 30  # 30 seconds timeout
        
        while not os.path.exists(self.input_file):
            if time.time() - start_time > timeout:
                print("Input timeout. No input provided within 30 seconds.")
                return ""
            time.sleep(0.1)
        
        # Read the input
        with open(self.input_file, "r") as f:
            user_input = f.read().strip()
        
        # Clean up
        os.remove(self.input_file)
        os.remove(self.request_file)
        
        # Signal that input was received
        with open(self.received_file, "w") as f:
            f.write("received")
        
        return user_input

# Replace the built-in input function
input_bridge = SocketInputBridge("${sessionId}")
__builtins__.input = input_bridge.input
  `;

  // Prepare the Python code with the socket helper imported
  const modifiedCode = `
# Import the socket input bridge
exec(open('/code/${sessionId}_socket_helper.py').read())

# Original code follows
${sanitizedCode}
  `;

  // Write files
  fs.writeFileSync(socketHelperPath, socketHelperCode);
  fs.writeFileSync(codePath, modifiedCode);

  // Set up Docker container configuration
  const containerConfig = {
    Image: 'python:3.9-slim',
    Cmd: ['python', `/code/${sessionId}.py`],
    HostConfig: {
      Binds: [
        `${codePath}:/code/${sessionId}.py:ro`,
        `${socketHelperPath}:/code/${sessionId}_socket_helper.py:ro`,
        `${TEMP_DIR}:/tmp:rw`  // Allow read/write to /tmp for communication
      ],
      Memory: 100 * 1024 * 1024, // 100MB memory limit
      CpuPeriod: 100000,
      CpuQuota: 10000, // 10% CPU limit
      NetworkMode: 'none', // No network access
    },
    WorkingDir: '/code',
    Tty: false,
    OpenStdin: true,
    StdinOnce: true,
  };

  // Create and start the container
  let container;
  let stdout = "";
  let stderr = "";
  let fsWatcher = null;

  try {
    container = await dockerClient.createContainer(containerConfig);
    await container.start();

    // Start a file watcher to check for input requests
    fsWatcher = fs.watch(TEMP_DIR, async (eventType, filename) => {
      // Check if this is an input request file
      if (filename === `input_request_${sessionId}.txt`) {
        const fullPath = path.join(TEMP_DIR, filename);

        if (fs.existsSync(fullPath)) {
          try {
            // Read the prompt
            const prompt = fs.readFileSync(fullPath, 'utf8');

            // Request input from client via socket
            socket.emit('input-required', { sessionId, prompt });

            // Handle input received from socket
            const handleInput = (data) => {
              if (data.sessionId === sessionId) {
                // Write input to the file for the Python code to read
                fs.writeFileSync(path.join(TEMP_DIR, `socket_input_${sessionId}.txt`), data.input);

                // Remove listener after handling
                socket.removeListener('provide-input', handleInput);
              }
            };

            // Add listener for input response
            socket.on('provide-input', handleInput);

            // Set timeout for input
            setTimeout(() => {
              if (fs.existsSync(fullPath)) {
                // Timeout occurred, write empty input
                fs.writeFileSync(path.join(TEMP_DIR, `socket_input_${sessionId}.txt`), "");
                socket.removeListener('provide-input', handleInput);
              }
            }, 30000); // 30 seconds timeout
          } catch (err) {
            console.error('Error handling input request:', err);
          }
        }
      }
    });

    // Set a timeout to kill the container if it runs too long
    const containerTimeout = setTimeout(async () => {
      try {
        await container.stop();
        stderr += 'Program execution timed out (60 seconds limit).';
      } catch (err) {
        stderr += 'Error stopping container: ' + err.message;
      }
    }, 60000); // 60 second timeout (longer to account for input waiting)

    // Wait for the container to finish
    await container.wait();
    clearTimeout(containerTimeout);

    // Get logs
    const logs = await container.logs({ stdout: true, stderr: true });
    const output = logs.toString('utf8');

    const stdoutLines = [];
    const stderrLines = [];

    let remainingOutput = output;
    while (remainingOutput.length > 0) {
      // Each Docker log entry starts with a header of 8 bytes
      if (remainingOutput.length < 8) break;

      const streamType = remainingOutput.charCodeAt(0);
      // The next 3 bytes are zeros, and the next 4 bytes represent the message size
      // For simplicity, we'll just search for the next header instead of parsing size

      // Get the content between headers
      const nextHeaderPos = remainingOutput.indexOf('\u0001', 1);
      const nextHeaderPos2 = remainingOutput.indexOf('\u0002', 1);

      let contentEndPos;
      if (nextHeaderPos === -1 && nextHeaderPos2 === -1) {
        contentEndPos = remainingOutput.length;
      } else if (nextHeaderPos === -1) {
        contentEndPos = nextHeaderPos2;
      } else if (nextHeaderPos2 === -1) {
        contentEndPos = nextHeaderPos;
      } else {
        contentEndPos = Math.min(nextHeaderPos, nextHeaderPos2);
      }

      // Extract the content (skipping the 8-byte header)
      const content = remainingOutput.substring(8, contentEndPos);

      // Add content to the appropriate stream
      if (streamType === 1) {
        stdoutLines.push(content);
      } else if (streamType === 2) {
        stderrLines.push(content);
      }

      // Move to the next entry
      remainingOutput = remainingOutput.substring(contentEndPos);
    }

    // Parse output
    stdout = stdoutLines.join('');
    stderr = stderrLines.join('');
  } catch (err) {
    stderr = 'Server error: ' + err.message;
  } finally {
    // Clean up watcher
    if (fsWatcher) {
      fsWatcher.close();
    }

    // Clean up container
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (err) {
        console.error('Error removing container:', err);
      }
    }

    // Clean up files
    cleanupFile(codePath);
    cleanupFile(socketHelperPath);
    cleanupFile(path.join(TEMP_DIR, `socket_input_${sessionId}.txt`));
    cleanupFile(path.join(TEMP_DIR, `input_request_${sessionId}.txt`));
    cleanupFile(path.join(TEMP_DIR, `input_received_${sessionId}.txt`));
  }

  return { stdout, stderr };
};

// Execute JavaScript code using Docker with Socket.io for input
const executeJavaScriptWithSocket = async (code, sessionId, socket) => {
  const codePath = path.join(TEMP_DIR, `${sessionId}.js`);

  // Sanitize the code
  const sanitizedCode = sanitizeInput(code);

  // Create a wrapper that handles input via socket
  const wrappedCode = `
    // Setup mock input system with file-based communication
    const fs = require('fs');
    const path = require('path');
    
    // File paths for communication
    const requestFile = path.join('/tmp', \`input_request_${sessionId}.txt\`);
    const inputFile = path.join('/tmp', \`socket_input_${sessionId}.txt\`);
    const receivedFile = path.join('/tmp', \`input_received_${sessionId}.txt\`);
    
    // Clean up any existing files
    [requestFile, inputFile, receivedFile].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    
    // Custom prompt function that communicates with the Node.js server
    global.prompt = function(message = "Input required:") {
      // Write prompt to request file
      fs.writeFileSync(requestFile, message);
      
      // Wait for input (simple polling)
      let startTime = Date.now();
      let input = null;
      
      while (!input && Date.now() - startTime < 30000) { // 30 second timeout
        if (fs.existsSync(inputFile)) {
          input = fs.readFileSync(inputFile, 'utf8').trim();
          fs.unlinkSync(inputFile);
          fs.unlinkSync(requestFile);
          fs.writeFileSync(receivedFile, 'received');
          break;
        }
        
        // Sleep to avoid high CPU usage
        for (let i = 0; i < 1000000; i++) {}
      }
      
      if (!input) {
        console.log("Input timeout. No input provided within 30 seconds.");
        return "";
      }
      
      return input;
    };
    
    // Original code follows
    ${sanitizedCode}
  `;

  // Write code file
  fs.writeFileSync(codePath, wrappedCode);

  // Set up Docker container
  const containerConfig = {
    Image: 'node:20-alpine',
    Cmd: ['node', `/code/${sessionId}.js`],
    HostConfig: {
      Binds: [
        `${codePath}:/code/${sessionId}.js:ro`,
        `${TEMP_DIR}:/tmp:rw`  // Allow read/write to /tmp for communication
      ],
      Memory: 100 * 1024 * 1024,
      CpuPeriod: 100000,
      CpuQuota: 10000,
      NetworkMode: 'none',
    },
    WorkingDir: '/code',
    Tty: false,
  };

  // Create and start the container
  let container;
  let stdout = "";
  let stderr = "";
  let fsWatcher = null;

  try {
    container = await dockerClient.createContainer(containerConfig);
    await container.start();

    // Set up file watcher similar to Python version
    fsWatcher = fs.watch(TEMP_DIR, async (eventType, filename) => {
      // Check if this is an input request file
      if (filename === `input_request_${sessionId}.txt`) {
        const fullPath = path.join(TEMP_DIR, filename);

        if (fs.existsSync(fullPath)) {
          try {
            // Read the prompt
            const prompt = fs.readFileSync(fullPath, 'utf8');

            // Request input from client via socket
            socket.emit('input-required', { sessionId, prompt });

            // Handle input received from socket
            const handleInput = (data) => {
              if (data.sessionId === sessionId) {
                // Write input to the file for the JS code to read
                fs.writeFileSync(path.join(TEMP_DIR, `socket_input_${sessionId}.txt`), data.input);

                // Remove listener after handling
                socket.removeListener('provide-input', handleInput);
              }
            };

            // Add listener for input response
            socket.on('provide-input', handleInput);

            // Set timeout for input
            setTimeout(() => {
              if (fs.existsSync(fullPath)) {
                // Timeout occurred, write empty input
                fs.writeFileSync(path.join(TEMP_DIR, `socket_input_${sessionId}.txt`), "");
                socket.removeListener('provide-input', handleInput);
              }
            }, 30000); // 30 seconds timeout
          } catch (err) {
            console.error('Error handling input request:', err);
          }
        }
      }
    });

    // Set timeout and wait for container similar to Python version
    const containerTimeout = setTimeout(async () => {
      try {
        await container.stop();
        stderr += 'Program execution timed out (60 seconds limit).';
      } catch (err) {
        stderr += 'Error stopping container: ' + err.message;
      }
    }, 60000);

    await container.wait();
    clearTimeout(containerTimeout);

    const logs = await container.logs({ stdout: true, stderr: true });
    const output = logs.toString('utf8');
    stdout = output.replace(/\u0001\u0000\u0000\u0000/g, '').replace(/\u0002\u0000\u0000\u0000/g, '');

  } catch (err) {
    stderr = 'Server error: ' + err.message;
  } finally {
    // Clean up resources as in Python version
    if (fsWatcher) {
      fsWatcher.close();
    }

    if (container) {
      try {
        await container.remove({ force: true });
      } catch (err) {
        console.error('Error removing container:', err);
      }
    }

    cleanupFile(codePath);
    cleanupFile(path.join(TEMP_DIR, `socket_input_${sessionId}.txt`));
    cleanupFile(path.join(TEMP_DIR, `input_request_${sessionId}.txt`));
    cleanupFile(path.join(TEMP_DIR, `input_received_${sessionId}.txt`));
  }

  return { stdout, stderr };
};

module.exports = {
  executeCodeWithSocket
};