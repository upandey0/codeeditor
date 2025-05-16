import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const InputDialog = ({
  isOpen,
  prompt,
  onSubmit,
  theme = 'dark'
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
 
  // Focus input field when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
 
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
   
    if (input.trim()) {
      // Send the input to the parent component
      onSubmit(input);
      setInput('');
    }
  };
 
  // Handle key press events
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
 
  // If dialog is not open, don't render anything
  if (!isOpen) return null;
 
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className={`relative p-6 w-full max-w-md rounded-lg shadow-xl ${
        theme === 'light' ? 'bg-white' : 'bg-gray-800'
      }`}>
        <h3 className={`text-lg font-medium mb-2 ${
          theme === 'light' ? 'text-gray-900' : 'text-white'
        }`}>
          Program Input Required
        </h3>
       
        <div className={`mb-4 p-3 rounded ${
          theme === 'light' ? 'bg-blue-50 text-blue-700' : 'bg-blue-900 bg-opacity-30 text-blue-200'
        }`}>
          {prompt || 'Please provide input:'}
        </div>
       
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`flex-1 p-2 rounded border ${
                theme === 'light'
                ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900'
                : 'border-gray-600 bg-gray-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-white'
              }`}
              placeholder="Enter your input here..."
            />
           
            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-2 rounded-full ${
                input.trim() 
                ? (theme === 'light'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-700 hover:bg-blue-600 text-white')
                : (theme === 'light'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed')
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
       
        <p className={`mt-4 text-xs ${
          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          Press Enter to submit your input to the running program.
        </p>
      </div>
    </div>
  );
};

export default InputDialog;