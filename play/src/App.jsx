import { useState } from 'react'
import CodeEditor from './components/CodeEditor'
import { AuthProvider } from './context/AuthContext'

function App() {

  return (
    <> 
      <AuthProvider>
        <CodeEditor />
      </AuthProvider>
    </>
  )
}

export default App
