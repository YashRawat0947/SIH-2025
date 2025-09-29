import React from 'react'

const SystemStatus = ({ 
  status, 
  autoRefresh, 
  setAutoRefresh, 
  onRefresh, 
  onGeneratePredictions, 
  onClearOverrides,
  loading 
}) => {
  const getStatusColor = (systemStatus) => {
    switch (systemStatus) {
      case 'running': return 'text-green-600 bg-green-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'initializing': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (systemStatus) => {
    switch (systemStatus) {
      case 'running':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">System Control Panel</h2>
        <div className="flex items-center space-x-4">
          {status && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.status)}`}>
              {getStatusIcon(status.status)}
              <span className="ml-2 capitalize">{status.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* System Metrics */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{status.trains_count}</div>
            <div className="text-sm text-gray-500">Total Trains</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {status.ml_model_trained ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-500">ML Model</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {status.optimization_completed ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-500">Optimization</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{status.manual_overrides_count}</div>
            <div className="text-sm text-gray-500">Overrides</div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="loading-spinner mr-2"></div>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Refresh Data
        </button>

        <button
          onClick={onGeneratePredictions}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="loading-spinner mr-2"></div>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
          Generate Predictions
        </button>

        <button
          onClick={onClearOverrides}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Overrides
        </button>

        <div className="flex items-center ml-auto">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-offset-0 focus:ring-blue-200 focus:ring-opacity-50"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh (5 min)</span>
          </label>
        </div>
      </div>

      {/* Last Update */}
      {status?.last_update && (
        <div className="mt-4 text-xs text-gray-500">
          Last updated: {new Date(status.last_update).toLocaleString()}
        </div>
      )}
    </div>
  )
}

export default SystemStatus