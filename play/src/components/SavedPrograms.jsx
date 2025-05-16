import { Save } from 'lucide-react';

const SavedPrograms = ({ savedPrograms, loadProgram, theme }) => {
  return (
    <div className={`rounded-lg shadow-md overflow-hidden border ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
      <div className={`p-2 border-b ${theme === 'light' ? 'bg-amber-500' : 'bg-amber-600'} text-white`}>
        <h3 className="font-medium">My Programs</h3>
      </div>
      <div className={`p-4 ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
        {savedPrograms.length > 0 ? (
          <div className="max-h-48 overflow-auto">
            {savedPrograms.map((program, index) => (
              <div
                key={index}
                className={`border-b last:border-b-0 py-2 cursor-pointer ${theme === 'light' ? 'hover:bg-gray-50 border-gray-200' : 'hover:bg-gray-700 border-gray-700'}`}
                onClick={() => loadProgram(program)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{program.name}</span>
                  <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{program.language}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <Save className={`w-8 h-8 ${theme === 'light' ? 'text-amber-500' : 'text-amber-400'} mb-2`} />
            <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>Save your programs to access them later!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPrograms;