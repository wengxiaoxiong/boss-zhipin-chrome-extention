
import './App.css'

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="bg-white bg-opacity-80 rounded-3xl shadow-xl p-10 flex flex-col items-center space-y-6">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 mb-2">
          Hello Tailwind!
        </h1>
        <p className="text-lg text-gray-700">
          Tailwind CSS is <span className="font-semibold text-purple-600">working!</span>
        </p>
        <button className="mt-4 px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 text-white font-medium shadow-lg hover:scale-105 transition-all duration-200">
          Test 按钮
        </button>
      </div>
      <style>
        {`
          .animate-spin-slow {
            animation: spin 8s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}

export default App

