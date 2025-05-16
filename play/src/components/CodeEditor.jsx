import { useState, useEffect, useRef } from 'react';
import { Play, Trash2, Save } from 'lucide-react';
import useCodeBuddyApi from '../api/apiService.js';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';
import SavedPrograms from './SavedPrograms.jsx';
import Header from './Header';
import ChallengesPanel from './ChallengesPanel';
import OutputPanel from './OutputPanel';

// Main CodeEditor component
const CodeEditor = () => {
  const [code, setCode] = useState('# Try printing your name!\nprint("Hello, world!")');
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState('python');
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(16);
  const [isRunning, setIsRunning] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [savedPrograms, setSavedPrograms] = useState([]);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const editorRef = useRef(null);

  // Initialize the API hook
  const {
    executeCode,
    provideInput,
    inputRequired,
    inputPrompt,
    saveProgram: saveRemoteProgram,
    completeChallenge: completeRemoteChallenge,
    isLoading,
    error
  } = useCodeBuddyApi();

  const {
    currentUser,
    userPoints,
    userStreak,
    isLoggedIn,
    updatePoints,
    updateStreak,
    logout
  } = useAuth();

  // Mock challenges for beginners
  const challenges = [
    {
      id: 1,
      title: "Hello, You!",
      description: "Modify the program to print your own name instead of 'world'",
      template: 'print("Hello, world!")',
      hint: "Change 'world' to your name between the quotes",
      points: 5
    },
    {
      id: 2,
      title: "Adding Machine",
      description: "Write a program that adds two numbers from user input",
      template: '# Get two numbers from user and add them\n# Hint: use input() and int()\n\n',
      hint: "Try: num1 = int(input('Enter first number: '))",
      points: 10
    },
    {
      id: 3,
      title: "Count to Ten",
      description: "Write a program that counts from 1 to 10",
      template: '# Use a for loop to count from 1 to 10\n\n',
      hint: "Try: for i in range(1, 11):",
      points: 15
    },
    {
      id: 4,
      title: "Variable Calculator",
      description: "Create variables and perform calculations with them",
      template: '# Create variables a and b, set them to numbers\n# Calculate their sum in variable c\n# Print the result\n',
      hint: "Try: a = 20\nb = 30\nc = a + b\nprint(c)",
      points: 20
    }
  ];

  // Load user data from localStorage on component mount
  useEffect(() => {
    const savedPrograms = localStorage.getItem('codebuddyPrograms');
    if (savedPrograms) {
      setSavedPrograms(JSON.parse(savedPrograms));
    }
  }, []);

  // Effect to append input prompt to output when input is required
  useEffect(() => {
    if (inputRequired && inputPrompt) {
      setOutput(prev => `${prev}${inputPrompt}`);
    }
  }, [inputRequired, inputPrompt]);

  // Function to handle user input submission
  const handleInputSubmit = (userInput) => {
    // Append the user input to the output and add a newline
    setOutput(prev => `${prev}${userInput}\n`);
    
    // Provide the input to the running code via the API
    provideInput(userInput);
  };

  // Run code with API instead of simulation
  const runCode = async () => {
    setIsRunning(true);
    setOutput(prev => `${prev}\n> Running code...\n`);

    try {
      // Use the API to execute code
      const result = await executeCode(code, language);

      // Parse the response - result contains stdout and stderr
      let outputText = result.stdout || '';
      if (result.stderr) {
        outputText += '\n' + result.stderr;
      }

      // If output is empty but no error
      if (!outputText && !result.stderr) {
        outputText = "Program executed successfully, but no output was generated.";
      }

      // Append output to existing terminal content
      setOutput(prev => `${prev}${outputText}`);
      
      // Add execution success message when program completes without errors
      if (!result.stderr) {
        setOutput(prev => `${prev}\n\n==== Program executed Successfully ====\n`);
      }

      // Award points for running code
      updatePoints(userPoints + 1);

      // Check for streak
      const lastRun = localStorage.getItem('lastCodeRun');
      const today = new Date().toDateString();

      if (lastRun !== today) {
        updateStreak(userStreak + 1);
        localStorage.setItem('lastCodeRun', today);
      }

      // Check if current challenge is completed
      if (currentChallenge) {
        // Improved challenge completion check
        // For variable calculation challenge
        if (
          (currentChallenge.id === 4 &&
            code.includes('a') &&
            code.includes('b') &&
            code.includes('c') &&
            code.includes('print') &&
            outputText.trim() !== "Program executed successfully, but no output was generated.")
        ) {
          await handleChallengeCompletion();
          setOutput(prev => `${prev}\n\n🎉 Challenge completed! You earned ${currentChallenge.points} points!\n`);
          return;
        }
        // For other challenges
        else if (
          (currentChallenge.id === 1 && code.includes('print("Hello,') && !code.includes('print("Hello, world!')) ||
          (currentChallenge.id === 2 && code.includes('input') && code.includes('+')) ||
          (currentChallenge.id === 3 && code.includes('range') && outputText.split('\n').filter(line => line.trim()).length >= 10)
        ) {
          await handleChallengeCompletion();
          setOutput(prev => `${prev}\n\n🎉 Challenge completed! You earned ${currentChallenge.points} points!\n`);
          return;
        }
      }
    } catch (error) {
      setOutput(prev => `${prev}Error: ${error.message}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  // Handle challenge completion with API
  const handleChallengeCompletion = async () => {
    try {
      if (isLoggedIn && currentUser) {
        // Update challenge completion on the server
        const result = await completeRemoteChallenge(currentUser, currentChallenge.id, currentChallenge.points);
        updatePoints(result.points);
      } else {
        // Fallback to local if not logged in
        updatePoints(userPoints + currentChallenge.points);
      }

      setAchievements(prev => [...prev, `Completed: ${currentChallenge.title}`]);
      setCurrentChallenge(null);
    } catch (error) {
      console.error("Failed to register challenge completion:", error);
    }
  };

  const clearCode = () => {
    if (window.confirm('Are you sure you want to clear your code?')) {
      setCode('# Write your code here\n');
      setOutput('');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Save program locally and remotely if logged in
  const saveProgram = async () => {
    const name = prompt('Enter a name for your program:');
    if (name) {
      // Local save
      const newPrograms = [...savedPrograms, { name, code, language }];
      setSavedPrograms(newPrograms);
      localStorage.setItem('codebuddyPrograms', JSON.stringify(newPrograms));

      // Remote save if logged in
      if (isLoggedIn && currentUser) {
        try {
          await saveRemoteProgram(currentUser, name, code, language);
          setOutput(prev => `${prev}\nProgram "${name}" saved successfully to your account!\n`);
        } catch (error) {
          console.error("Failed to save program remotely:", error);
          setOutput(prev => `${prev}\nProgram "${name}" saved locally. Cloud sync failed.\n`);
        }
      } else {
        setOutput(prev => `${prev}\nProgram "${name}" saved successfully! Log in to sync across devices.\n`);
      }

      if (savedPrograms.length === 0) {
        setAchievements(prev => [...prev, 'First Save!']);
      }
    }
  };

  const loadProgram = (program) => {
    setCode(program.code);
    setLanguage(program.language);
    setOutput(prev => `${prev}\nLoaded program: ${program.name}\n`);
  };

  const startChallenge = (challenge) => {
    setCurrentChallenge(challenge);
    setCode(challenge.template);
    setOutput(prev => `${prev}\nChallenge started: ${challenge.description}\n`);
    setShowChallenges(false);
  };

  const showHint = () => {
    if (currentChallenge) {
      setOutput(prev => `${prev}\nHint: ${currentChallenge.hint}\n`);
    } else {
      setOutput(prev => `${prev}\nSelect a challenge first to see hints!\n`);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      setOutput(prev => `${prev}\nYou have been logged out.\n`);
    }
  };

  // Prepare editor theme classes
  const editorClass = `p-4 h-96 font-mono text-base outline-none w-full rounded-md transition-colors ${theme === 'light'
    ? 'bg-amber-50 text-gray-800 border border-amber-200'
    : 'bg-gray-900 text-amber-50 border border-gray-700'
    }`;

  const buttonClass = "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors";

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'light' ? 'bg-blue-50' : 'bg-gray-900 text-white'}`}>
      {/* Header */}
      <Header 
        userName={currentUser || "Guest"} 
        points={userPoints} 
        streak={userStreak} 
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        isLoggedIn={isLoggedIn}
        handleLogout={handleLogout}
        setShowLoginModal={setShowLoginModal}
      />

      <main className="flex flex-1 p-4 gap-6">
        {/* Left Column - Editor Section */}
        <div className="flex flex-col gap-4 w-1/2">
          {/* Editor section */}
          <div className={`rounded-lg shadow-lg overflow-hidden border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
            <div className={`p-2 border-b flex items-center justify-between ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-700 border-gray-600'}`}>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>
                {currentChallenge ? `Challenge: ${currentChallenge.title}` : 'editor.py'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFontSize(prev => Math.min(prev + 2, 24))}
                  className={`${theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-white'} text-xs`}
                >
                  A+
                </button>
                <button
                  onClick={() => setFontSize(prev => Math.max(prev - 2, 12))}
                  className={`${theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-white'} text-xs`}
                >
                  A-
                </button>
              </div>
            </div>

            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ fontSize: `${fontSize}px` }}
              className={editorClass}
              spellCheck="false"
              placeholder="Write your code here..."
            />

            <div className={`flex p-4 gap-2 justify-between ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'}`}>
              <div>
                <button
                  onClick={runCode}
                  disabled={isRunning || inputRequired}
                  className={`${buttonClass} ${theme === 'light'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'} ${(isRunning || inputRequired) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Play className="w-4 h-4" /> {isRunning ? 'Running...' : 'Run'}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveProgram}
                  className={`${buttonClass} ${theme === 'light'
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                  <Save className="w-4 h-4" /> Save
                </button>

                <button
                  onClick={clearCode}
                  className={`${buttonClass} ${theme === 'light'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'}`}
                >
                  <Trash2 className="w-4 h-4" /> Clear
                </button>
              </div>
            </div>
          </div>

          {/* Saved programs panel */}
          
        </div>

        {/* Right Column - Output and Tools Section */}
        <div className="flex flex-col gap-4 w-1/2">
          
          {/* Interactive Output Terminal */}
          <OutputPanel 
            output={output} 
            setOutput={setOutput} 
            inputRequired={inputRequired}
            inputPrompt={inputPrompt}
            onInputSubmit={handleInputSubmit}
            isLoading={isLoading} 
            error={error} 
            theme={theme} 
          />

          {/* Challenges panel */}
          <ChallengesPanel 
            theme={theme}
            currentChallenge={currentChallenge}
            showChallenges={showChallenges}
            setShowChallenges={setShowChallenges}
            challenges={challenges}
            showHint={showHint}
            startChallenge={startChallenge}
            setCurrentChallenge={setCurrentChallenge}
          />
          <SavedPrograms 
            savedPrograms={savedPrograms} 
            loadProgram={loadProgram} 
            theme={theme} 
          />
          {showLoginModal && (
            <LoginModal
              isOpen={showLoginModal}
              onClose={() => setShowLoginModal(false)}
            />)}

          {/* Achievements section */}
          {achievements.length > 0 && (
            <div className={`p-3 rounded-lg shadow-md ${theme === 'light' ? 'bg-yellow-500' : 'bg-yellow-600'} text-white`}>
              <h3 className="font-bold mb-1">Recent Achievements:</h3>
              <div className="flex flex-wrap gap-2">
                {achievements.slice(-3).map((achievement, index) => (
                  <span key={index} className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                    🏆 {achievement}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className={`p-4 text-center text-sm ${theme === 'light' ? 'text-gray-500 border-t border-gray-200' : 'text-gray-400 border-t border-gray-700'}`}>
        <p>CodeBuddy Junior - Learn to code in a fun, interactive way! © 2025</p>
      </footer>
    </div>
  );
};

export default CodeEditor;