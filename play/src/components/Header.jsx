import { Crown, Medal, Github } from 'lucide-react';

const Header = ({ 
  userName, 
  points, 
  streak, 
  language, 
  setLanguage, 
  theme, 
  toggleTheme, 
  isLoggedIn, 
  handleLogout, 
  setShowLoginModal 
}) => {
  const buttonClass = "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors";

  return (
    <header className={`flex items-center justify-between p-4 shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
          {userName ? userName.charAt(0).toUpperCase() : 'CB'}
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">CodeBuddy Junior</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Crown className={`w-5 h-5 ${theme === 'light' ? 'text-yellow-500' : 'text-yellow-400'}`} />
          <span className="font-bold">{points} pts</span>
        </div>
        <div className="flex items-center gap-1">
          <Medal className={`w-5 h-5 ${theme === 'light' ? 'text-blue-500' : 'text-blue-400'}`} />
          <span>{streak} day streak</span>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={`p-2 rounded border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-700 border-gray-600 text-white'}`}
        >
          <option value="python">Python</option>
          <option value="javascript" disabled>JavaScript (Coming Soon)</option>
          <option value="scratch" disabled>Scratch (Coming Soon)</option>
        </select>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className={`${buttonClass} ${theme === 'light'
              ? 'bg-red-100 hover:bg-red-200 text-red-800'
              : 'bg-red-800 hover:bg-red-700 text-white'}`}
          >
            Logout
          </button>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className={`${buttonClass} ${theme === 'light'
              ? 'bg-blue-100 hover:bg-blue-200 text-blue-800'
              : 'bg-blue-800 hover:bg-blue-700 text-white'}`}
          >
            Login / Register
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;