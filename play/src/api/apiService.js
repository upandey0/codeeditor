import { useState, useEffect } from 'react';
import socketService from './socketService';

const useCodeBuddyApi = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputRequired, setInputRequired] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Connect to socket service if not already connected
  const ensureSocketConnection = async () => {
    if (!socketService.isConnected) {
      try {
        await socketService.connect();
      } catch (err) {
        console.error("Failed to connect to socket service:", err);
        throw new Error("Unable to connect to code execution service");
      }
    }
    return socketService;
  };
  
  // Setup event listeners
  useEffect(() => {
    const setupListeners = async () => {
      try {
        const socket = await ensureSocketConnection();
        
        // Setup input request handler
        const handleInputRequest = (data) => {
          setCurrentSessionId(data.sessionId);
          setInputRequired(true);
          setInputPrompt(data.prompt || '');
          
          // We don't modify output here - we'll let the component handle that
        };
        
        // Setup execution result handler
        const handleExecutionResult = (result) => {
          setInputRequired(false);
          setInputPrompt('');
        };
        
        // Setup execution error handler
        const handleExecutionError = (error) => {
          setInputRequired(false);
          setInputPrompt('');
        };
        
        // Register listeners
        socket.on('input-required', handleInputRequest);
        socket.on('execution-result', handleExecutionResult);
        socket.on('execution-error', handleExecutionError);
        
        // Cleanup function
        return () => {
          socket.off('input-required', handleInputRequest);
          socket.off('execution-result', handleExecutionResult);
          socket.off('execution-error', handleExecutionError);
        };
      } catch (err) {
        console.error("Failed to setup listeners:", err);
      }
    };
    
    setupListeners();
  }, []);

  useEffect(() => {
    try {
      socketService.connect();
      
      // Setup socket event handlers for input requests
      const inputHandler = (data) => {
        setCurrentSessionId(data.sessionId);
        setInputRequired(true);
        setInputPrompt(data.prompt || "Input: ");
      };
      
      // Subscribe to socket events
      socketService.on('input-required', inputHandler);
      
      // Cleanup on unmount
      return () => {
        socketService.off('input-required', inputHandler);
      };
    } catch (error) {
      console.error('Failed to connect socket:', error);
      setError('Failed to connect to code execution service');
    }
  }, []);
  
  // Execute code using Socket.io
  const executeCode = async (code, language) => {
    setIsLoading(true);
    setError(null);
    setInputRequired(false);
    setInputPrompt('');
    setCurrentSessionId(null);
    
    try {
      // Ensure socket connection
      const socket = await ensureSocketConnection();
      
      // Execute code
      const result = await socket.executeCode(code, language);
      return result;
    } catch (err) {
      setError(err.message);
      console.error("Code execution error:", err);
      return { stdout: '', stderr: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Provide input to running code
  const provideInput = async (input) => {
    if (!currentSessionId) {
      setError('No active session');
      return;
    }
    
    try {
      const socket = await ensureSocketConnection();
      socket.provideInput(currentSessionId, input);
      setInputRequired(false);
      setInputPrompt('');
    } catch (err) {
      setError(err.message);
      console.error("Failed to provide input:", err);
    }
  };
  
  // User login
  const login = async (username, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const userData = await response.json();
      
      // Store user data in localStorage for persistence
      localStorage.setItem('codebuddyUser', JSON.stringify({
        username: userData.username,
        points: userData.points,
        streak: userData.streak
      }));
      
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Save program to the server
  const saveProgram = async (username, name, code, language) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/program/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, name, code, language }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save program');
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete challenge
  const completeChallenge = async (username, challengeId, points) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/challenge/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, challengeId, points }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete challenge');
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cleanup function to disconnect socket
  const cleanup = () => {
    socketService.disconnect();
  };
  
  return {
    executeCode,
    provideInput,
    login,
    saveProgram,
    completeChallenge,
    isLoading,
    error,
    inputRequired,
    inputPrompt,
    cleanup
  };
};

export default useCodeBuddyApi;