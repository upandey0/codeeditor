import { useState, useRef, useEffect } from 'react';

const OutputPanel = ({ 
  output,
  setOutput, 
  isLoading, 
  error, 
  theme, 
  inputRequired, 
  inputPrompt, 
  onInputSubmit 
}) => {
  const [inputValue, setInputValue] = useState('');
  const outputContainerRef = useRef(null);
  const cursorRef = useRef(null);
  const terminalRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Enhanced cursor visibility with more prominent blinking
  useEffect(() => {
    let blinkInterval;
    if (inputRequired && cursorRef.current) {
      // Make cursor more prominent when input is required
      blinkInterval = setInterval(() => {
        if (cursorRef.current) {
          cursorRef.current.style.opacity = cursorRef.current.style.opacity === '0' ? '1' : '0';
        }
      }, 500);
    }
    
    return () => clearInterval(blinkInterval);
  }, [inputRequired]);
  
  // Auto-scroll to bottom when output changes or input is required
  useEffect(() => {
    if (outputContainerRef.current) {
      outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
    }
  }, [output, inputRequired, inputValue]);
  
  // Focus the terminal when input is required and auto-focus on mount
  useEffect(() => {
    if (inputRequired && terminalRef.current) {
      terminalRef.current.focus();
      setIsFocused(true);
    }
  }, [inputRequired]);
  
  // Handle key presses in the terminal
  const handleKeyDown = (e) => {
    if (!inputRequired) return;
    
    // Enter key submits the input
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim() !== '' || inputValue === '') {
        onInputSubmit(inputValue);
        setInputValue('');
      }
      return;
    }
    
    // Backspace removes the last character
    if (e.key === 'Backspace') {
      e.preventDefault();
      setInputValue(prev => prev.slice(0, -1));
      return;
    }
    
    // Tab and other control keys should be ignored
    if (e.key === 'Tab' || e.key.length > 1) {
      e.preventDefault();
      return;
    }
    
    // Add the character to input value
    setInputValue(prev => prev + e.key);
  };

  // Handle focus/blur events to show different cursor styles
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  
  // Parse the output to render, treating everything as unified terminal output
  const renderTerminalContent = () => {
    // Display loading state as an indicator below the current output
    const loadingIndicator = isLoading ? (
      <div className="mt-2 animate-pulse text-yellow-500">
        Running your code...
      </div>
    ) : null;
    
    // If error exists, handle it
    let errorContent = null;
    if (error) {
      errorContent = (
        <div className="text-red-500 mt-2 border-t border-red-300 pt-2">
          <span className="font-medium">Error:</span> {error}
        </div>
      );
    }
    
    // For both input and non-input states, we render a unified terminal output
    return (
      <>
        {/* Display all previous output */}
        <span className="whitespace-pre-wrap">{output}</span>
        
        {/* If waiting for input, show input typing area inline with enhanced cursor */}
        {inputRequired && !isLoading && (
          <span className="input-area">
            {/* Input value appears directly after the prompt in output */}
            <span className="input-text">{inputValue}</span>
            <span 
              ref={cursorRef} 
              className={`cursor inline-block w-2.5 h-5 align-middle ${
                isFocused 
                  ? theme === 'light' 
                    ? 'bg-blue-600' 
                    : 'bg-blue-400' 
                  : theme === 'light' 
                    ? 'bg-gray-400' 
                    : 'bg-gray-500'
              }`}
            >
            </span>
            {!isFocused && (
              <span className={`ml-2 text-xs ${theme === 'light' ? 'text-blue-600' : 'text-blue-300'}`}>
                (Click here to type)
              </span>
            )}
          </span>
        )}
        
        {/* Show loading indicator below current content */}
        {loadingIndicator}
        
        {!output && !inputRequired && !isLoading && 'Program output will appear here...'}
        {errorContent}
      </>
    );
  };
  
  return (
    <div className={`rounded-lg shadow-lg overflow-hidden border ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'}`}>
      <div className={`p-2 border-b flex justify-between items-center ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-700 border-gray-600'}`}>
        <h3 className={`font-medium ${theme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>
          {inputRequired ? (
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Terminal (Input Required)
            </span>
          ) : (
            'Terminal'
          )}
        </h3>
        <button
          onClick={() => setOutput('')}
          className={`text-xs ${theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-white'}`}
        >
          Clear Terminal
        </button>
      </div>
      
      {/* Interactive terminal display */}
      <pre 
        ref={(el) => {
          outputContainerRef.current = el;
          terminalRef.current = el;
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`p-4 font-mono text-sm h-64 overflow-auto whitespace-pre-wrap outline-none ${
          inputRequired ? 'cursor-text' : 'cursor-default'
        } ${theme === 'light' ? 'text-gray-800 bg-gray-50' : 'text-white bg-gray-900'}`}
        style={{ position: 'relative' }}
      >
        {renderTerminalContent()}
      </pre>
      
      {/* Enhanced input indicator when input is expected */}
      {inputRequired && (
        <div className={`px-4 py-2 border-t text-sm flex items-center ${
          theme === 'light' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-blue-900 bg-opacity-30 text-blue-200 border-blue-800'
        }`}>
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          <span>
            <strong>Input required</strong> - Click in the terminal type your response
          </span>
        </div>
      )}
      
      {/* Add custom styles for cursor blinking */}
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .cursor {
          animation: blink 1s step-end infinite;
        }
        .input-area {
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default OutputPanel;