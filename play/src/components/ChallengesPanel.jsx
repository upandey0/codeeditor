import { HelpCircle, Book } from 'lucide-react';

const ChallengesPanel = ({ 
  theme, 
  currentChallenge, 
  showChallenges, 
  setShowChallenges, 
  challenges, 
  showHint, 
  startChallenge, 
  setCurrentChallenge 
}) => {
  return (
    <div className={`rounded-lg shadow-md overflow-hidden border ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
      <div className={`p-2 border-b flex justify-between items-center ${theme === 'light' ? 'bg-purple-600' : 'bg-purple-800'} text-white`}>
        <h3 className="font-medium">Learning Challenges</h3>
        <button
          onClick={() => setShowChallenges(!showChallenges)}
          className="text-xs hover:underline"
        >
          {showChallenges ? 'Hide' : 'Show All'}
        </button>
      </div>

      <div className={`p-4 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
        {currentChallenge ? (
          <div className="flex flex-col gap-2">
            <h4 className="font-bold">{currentChallenge.title}</h4>
            <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>{currentChallenge.description}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={showHint}
                className={`text-xs ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'} hover:underline flex items-center gap-1`}
              >
                <HelpCircle className="w-3 h-3" /> Need a hint?
              </button>
              <button
                onClick={() => setCurrentChallenge(null)}
                className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} hover:underline`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {showChallenges ? (
              <div className="flex flex-col gap-3 max-h-48 overflow-auto">
                {challenges.map(challenge => (
                  <div key={challenge.id} className={`border rounded p-2 ${theme === 'light' ? 'hover:bg-gray-50 border-gray-200' : 'hover:bg-gray-700 border-gray-700'}`}>
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{challenge.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${theme === 'light' ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-800 text-yellow-200'}`}>
                        {challenge.points} pts
                      </span>
                    </div>
                    <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'} mt-1`}>{challenge.description}</p>
                    <button
                      onClick={() => startChallenge(challenge)}
                      className={`text-xs mt-2 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'} hover:underline`}
                    >
                      Start Challenge
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <Book className={`w-8 h-8 ${theme === 'light' ? 'text-blue-500' : 'text-blue-400'} mb-2`} />
                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>Complete coding challenges to earn points and badges!</p>
                <button
                  onClick={() => setShowChallenges(true)}
                  className={`mt-2 text-xs ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'} hover:underline`}
                >
                  Show Available Challenges
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengesPanel;