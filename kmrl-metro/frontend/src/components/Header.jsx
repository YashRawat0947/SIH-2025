import React from 'react'

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🚇 KMRL Train Induction Planning
              </h1>
              <p className="text-sm text-gray-500">
                AI-driven train induction planning for Kochi Metro Rail Limited
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Smart India Hackathon 2024</p>
              <p className="text-xs text-gray-500">Real-time Decision System</p>
            </div>
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header