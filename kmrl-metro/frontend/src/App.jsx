// Train Data Table Component
const TrainDataTable = ({ trainData, loading, lastUpdate }) => {
  const [filters, setFilters] = useState({
    decision: 'All',
    depot: 'All',
    minFitness: 0
  })
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' })

  // Get unique depots for filter dropdown
  const uniqueDepots = useMemo(() => {
    if (!trainData || trainData.length === 0) return []
    return [...new Set(trainData.map(train => train.depot || 'Unknown'))]
  }, [trainData])

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!trainData) return []

    let filtered = trainData.filter(train => {
      const decisionMatch = filters.decision === 'All' || train.final_decision === filters.decision
      const depotMatch = filters.depot === 'All' || train.depot === filters.depot
      const fitnessMatch = (train.fitness_score || 0) >= filters.minFitness
      
      return decisionMatch && depotMatch && fitnessMatch
    })

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || 0
        const bValue = b[sortConfig.key] || 0
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [trainData, filters, sortConfig])

  const requestSort = (key) => {
    let direction = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return (
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortConfig.direction === 'ascending' ? (
      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    )
  }

  const getDecisionBadge = (decision) => {
    if (decision === 'Induct') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-mono">
          ✓ INDUCT
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/50 font-mono">
          ✗ HOLD
        </span>
      )
    }
  }

  const getFitnessColor = (score) => {
    if (score >= 90) return 'text-emerald-400 font-bold'
    if (score >= 80) return 'text-cyan-400'
    if (score >= 70) return 'text-amber-400'
    return 'text-red-400 font-bold'
  }

  const formatReasoning = (reasoning) => {
    if (!reasoning) return 'No reasoning available'
    
    // Add tech-style prefixes
    let formatted = reasoning
    if (reasoning.includes('fitness score')) formatted = '⚡ ' + formatted
    else if (reasoning.includes('work order')) formatted = '🔧 ' + formatted
    else if (reasoning.includes('certificate')) formatted = '📊 ' + formatted
    else if (reasoning.includes('manual override')) formatted = '👨‍💻 ' + formatted
    
    return formatted
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-6 shadow-xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p className="text-slate-400 font-mono">Loading train data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Train Induction Matrix</h2>
        {lastUpdate && (
          <p className="text-sm text-slate-400 font-mono">
            Last sync: {new Date(lastUpdate).toLocaleString()}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
            Decision Filter
          </label>
          <select
            value={filters.decision}
            onChange={(e) => setFilters({...filters, decision: e.target.value})}
            className="w-full rounded-lg bg-slate-700/50 border border-slate-600/50 text-white shadow-sm focus:border-cyan-500 focus:ring-cyan-500/50 font-mono"
          >
            <option value="All">All Decisions</option>
            <option value="Induct">Induct</option>
            <option value="Hold">Hold</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
            Depot Filter
          </label>
          <select
            value={filters.depot}
            onChange={(e) => setFilters({...filters, depot: e.target.value})}
            className="w-full rounded-lg bg-slate-700/50 border border-slate-600/50 text-white shadow-sm focus:border-cyan-500 focus:ring-cyan-500/50 font-mono"
          >
            <option value="All">All Depots</option>
            {uniqueDepots.map(depot => (
              <option key={depot} value={depot}>{depot}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
            Min Fitness Score: {filters.minFitness}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minFitness}
            onChange={(e) => setFilters({...filters, minFitness: parseInt(e.target.value)})}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
            <span>0%</span>
            <span className="text-cyan-400 font-bold">{filters.minFitness}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-slate-400 font-mono">
          Showing <span className="text-cyan-400 font-bold">{filteredAndSortedData.length}</span> of <span className="text-cyan-400 font-bold">{trainData?.length || 0}</span> trains
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700/50">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-900/50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors font-mono"
                onClick={() => requestSort('train_id')}
              >
                <div className="flex items-center space-x-1">
                  <span>Train ID</span>
                  {getSortIcon('train_id')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors font-mono"
                onClick={() => requestSort('final_decision')}
              >
                <div className="flex items-center space-x-1">
                  <span>Decision</span>
                  {getSortIcon('final_decision')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors font-mono"
                onClick={() => requestSort('fitness_score')}
              >
                <div className="flex items-center space-x-1">
                  <span>Fitness</span>
                  {getSortIcon('fitness_score')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors font-mono"
                onClick={() => requestSort('depot')}
              >
                <div className="flex items-center space-x-1">
                  <span>Depot</span>
                  {getSortIcon('depot')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-800/50 transition-colors font-mono"
                onClick={() => requestSort('mileage')}
              >
                <div className="flex items-center space-x-1">
                  <span>Mileage</span>
                  {getSortIcon('mileage')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider font-mono">
                Work Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider font-mono">
                Cert Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider font-mono">
                AI Reasoning
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-800/20 divide-y divide-slate-700/30">
            {filteredAndSortedData.map((train, index) => (
              <tr 
                key={train.train_id || index}
                className={`hover:bg-slate-700/30 transition-all duration-200 ${
                  train.final_decision === 'Induct' ? 'border-l-2 border-emerald-500/50' : 'border-l-2 border-red-500/50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-cyan-300 font-mono">
                  {train.train_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getDecisionBadge(train.final_decision)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`${getFitnessColor(train.fitness_score || 0)} font-mono`}>
                    {(train.fitness_score || 0).toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                  {train.depot || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                  {(train.mileage || 0).toLocaleString()} km
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium font-mono ${
                    (train.open_work_orders || 0) > 0 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/50' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  }`}>
                    {train.open_work_orders || 0}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium font-mono ${
                    train.cert_valid 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' 
                      : 'bg-red-500/20 text-red-300 border border-red-500/50'
                  }`}>
                    {train.cert_valid ? '✓ VALID' : '✗ INVALID'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-300 max-w-xs">
                  <div className="truncate font-mono text-xs" title={train.reasoning}>
                    {formatReasoning(train.reasoning)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-300 font-mono">NO DATA FOUND</h3>
          <p className="mt-1 text-sm text-slate-500 font-mono">
            Adjust filter parameters to display results
          </p>
        </div>
      )}
    </div>
  )
}

// Manual Override Component
const ManualOverride = ({ trainData, onApplyOverride }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTrain, setSelectedTrain] = useState('')
  const [overrideDecision, setOverrideDecision] = useState('Induct')
  const [reason, setReason] = useState('Manual override by operator')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedTrain) {
      alert('Please select a train')
      return
    }

    setIsSubmitting(true)
    
    const decisionValue = overrideDecision === 'Induct' ? 1 : 0
    const success = await onApplyOverride(selectedTrain, decisionValue, reason)
    
    if (success) {
      setSelectedTrain('')
      setReason('Manual override by operator')
      setIsOpen(false)
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white font-mono">Manual Override Terminal</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center px-4 py-2 border border-amber-500/50 text-sm leading-4 font-medium rounded-lg text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all duration-200 font-mono"
        >
          {isOpen ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              CLOSE TERMINAL
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              ACCESS OVERRIDE
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-700/50 pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                  Target Train
                </label>
                <select
                  value={selectedTrain}
                  onChange={(e) => setSelectedTrain(e.target.value)}
                  className="w-full rounded-lg bg-slate-700/50 border border-slate-600/50 text-white shadow-sm focus:border-cyan-500 focus:ring-cyan-500/50 font-mono"
                  required
                >
                  <option value="">Select target...</option>
                  {trainData && trainData.map(train => (
                    <option key={train.train_id} value={train.train_id}>
                      {train.train_id} - {train.final_decision} ({(train.fitness_score || 0).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                  Override Command
                </label>
                <select
                  value={overrideDecision}
                  onChange={(e) => setOverrideDecision(e.target.value)}
                  className="w-full rounded-lg bg-slate-700/50 border border-slate-600/50 text-white shadow-sm focus:border-cyan-500 focus:ring-cyan-500/50 font-mono"
                >
                  <option value="Induct">INDUCT</option>
                  <option value="Hold">HOLD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 font-mono">
                  Override Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg bg-slate-700/50 border border-slate-600/50 text-white shadow-sm focus:border-cyan-500 focus:ring-cyan-500/50 font-mono"
                  placeholder="Enter justification..."
                  required
                />
              </div>
            </div>

            {/* Selected Train Info */}
            {selectedTrain && trainData && (
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                <h4 className="text-sm font-medium text-cyan-400 mb-3 font-mono">TARGET ANALYSIS</h4>
                {(() => {
                  const train = trainData.find(t => t.train_id === selectedTrain)
                  if (!train) return <p className="text-sm text-slate-500 font-mono">Target not found</p>
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
                      <div>
                        <span className="text-slate-400">Status:</span>
                        <div className={`font-bold ${train.final_decision === 'Induct' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {train.final_decision.toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Fitness:</span>
                        <div className="font-bold text-cyan-400">{(train.fitness_score || 0).toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Depot:</span>
                        <div className="font-bold text-white">{train.depot || 'Unknown'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">Work Orders:</span>
                        <div className="font-bold text-orange-400">{train.open_work_orders || 0}</div>
                      </div>
                      <div className="md:col-span-4">
                        <span className="text-slate-400">AI Reasoning:</span>
                        <div className="font-medium text-slate-300 text-xs mt-1 p-2 bg-slate-800/50 rounded border-l-2 border-cyan-500/50">
                          {train.reasoning}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-slate-600/50 rounded-lg text-sm font-medium text-slate-400 bg-slate-700/50 hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-slate-500/50 font-mono"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedTrain}
                className="inline-flex items-center px-4 py-2 border border-red-500/50 rounded-lg text-sm font-medium text-red-300 bg-red-500/20 hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-mono transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400 mr-2"></div>
                    EXECUTING...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    EXECUTE OVERRIDE
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Warning Message */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-300 font-mono">
                  ⚠️ CRITICAL SYSTEM WARNING
                </h3>
                <div className="mt-2 text-sm text-amber-200 font-mono">
                  <p>
                    Manual overrides bypass AI safety protocols and business logic constraints. 
                    Unauthorized access logged. All operations monitored by system administrators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Charts Section Component

import { useState, useEffect, useMemo } from 'react'
import ChartsSection from './components/ChartsSection'

const API_BASE_URL = 'http://localhost:8000'

// Header Component
const Header = () => {
  return (
    <header className="bg-slate-900 border-b border-cyan-500/30 shadow-lg shadow-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                KMRL Train Induction System
              </h1>
              <p className="text-sm text-slate-400 font-mono">
                AI-Powered Fleet Management | Kochi Metro Rail Limited
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-cyan-400">Smart India Hackathon 2025</p>
              <p className="text-xs text-slate-500 font-mono">Real-time Decision Engine</p>
            </div>
            <div className="h-10 w-10 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

// System Status Component
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
      case 'running': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50'
      case 'error': return 'text-red-400 bg-red-500/20 border-red-500/50'
      case 'initializing': return 'text-amber-400 bg-amber-500/20 border-amber-500/50'
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50'
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
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-6 shadow-xl shadow-cyan-500/5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">System Control Panel</h2>
        <div className="flex items-center space-x-4">
          {status && (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status.status)}`}>
              {getStatusIcon(status.status)}
              <span className="ml-2 capitalize font-mono">{status.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* System Metrics */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
            <div className="text-2xl font-bold text-cyan-400 font-mono">{status.trains_count}</div>
            <div className="text-sm text-slate-400">Total Trains</div>
          </div>
          <div className="text-center bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
            <div className="text-2xl font-bold text-emerald-400">
              {status.ml_model_trained ? '✓' : '✗'}
            </div>
            <div className="text-sm text-slate-400">ML Model</div>
          </div>
          <div className="text-center bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
            <div className="text-2xl font-bold text-purple-400">
              {status.optimization_completed ? '✓' : '✗'}
            </div>
            <div className="text-sm text-slate-400">Optimization</div>
          </div>
          <div className="text-center bg-slate-700/50 rounded-lg p-3 border border-slate-600/50">
            <div className="text-2xl font-bold text-orange-400 font-mono">{status.manual_overrides_count}</div>
            <div className="text-sm text-slate-400">Overrides</div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-cyan-500/50 text-sm font-medium rounded-lg text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/25"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400 mr-2"></div>
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
          className="inline-flex items-center px-4 py-2 border border-emerald-500/50 text-sm font-medium rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/25"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400 mr-2"></div>
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
          className="inline-flex items-center px-4 py-2 border border-red-500/50 text-sm font-medium rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25"
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
              className="rounded border-slate-600 bg-slate-700 text-cyan-500 shadow-sm focus:border-cyan-500 focus:ring focus:ring-offset-0 focus:ring-cyan-500/50 focus:ring-opacity-50"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="ml-2 text-sm text-slate-400 font-mono">Auto-refresh (5 min)</span>
          </label>
        </div>
      </div>

      {/* Last Update */}
      {status?.last_update && (
        <div className="mt-4 text-xs text-slate-500 font-mono">
          Last updated: {new Date(status.last_update).toLocaleString()}
        </div>
      )}
    </div>
  )
}

// Metrics Cards Component
const MetricsCards = ({ trainData }) => {
  const getMetrics = () => {
    if (!trainData || trainData.length === 0) {
      return {
        inductedCount: 0,
        heldCount: 0,
        avgFitness: 0,
        activeWorkOrders: 0
      }
    }

    const inductedCount = trainData.filter(train => train.final_decision === 'Induct').length
    const heldCount = trainData.filter(train => train.final_decision === 'Hold').length
    const avgFitness = trainData.reduce((sum, train) => sum + (train.fitness_score || 0), 0) / trainData.length
    const activeWorkOrders = trainData.reduce((sum, train) => sum + (train.open_work_orders || 0), 0)

    return {
      inductedCount,
      heldCount,
      avgFitness: avgFitness.toFixed(1),
      activeWorkOrders
    }
  }

  const metrics = getMetrics()

  const cards = [
    {
      title: 'Trains to Induct',
      value: metrics.inductedCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      color: 'text-emerald-400',
      bgColor: 'from-emerald-500/20 to-emerald-600/10',
      borderColor: 'border-emerald-500/30',
      glowColor: 'shadow-emerald-500/10',
      description: 'Ready for service'
    },
    {
      title: 'Trains to Hold',
      value: metrics.heldCount,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17.294 15M10 14l4-9.5M10 14l3 2m4-2v7a2 2 0 01-2 2H9a2 2 0 01-2-2v-7" />
        </svg>
      ),
      color: 'text-red-400',
      bgColor: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      glowColor: 'shadow-red-500/10',
      description: 'Maintenance required'
    },
    {
      title: 'Average Fitness',
      value: `${metrics.avgFitness}%`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-cyan-400',
      bgColor: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/30',
      glowColor: 'shadow-cyan-500/10',
      description: 'Fleet health score'
    },
    {
      title: 'Active Work Orders',
      value: metrics.activeWorkOrders,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-orange-400',
      bgColor: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
      glowColor: 'shadow-orange-500/10',
      description: 'Pending maintenance'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => (
        <div key={index} className={`bg-gradient-to-br ${card.bgColor} backdrop-blur-sm rounded-xl border ${card.borderColor} p-6 shadow-xl ${card.glowColor} hover:shadow-2xl transition-all duration-300 hover:scale-105`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-3 rounded-xl bg-slate-800/50 border border-slate-600/50`}>
              <div className={card.color}>
                {card.icon}
              </div>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center">
                <h3 className={`text-2xl font-bold font-mono ${card.color}`}>
                  {card.value}
                </h3>
              </div>
              <p className="text-sm font-medium text-slate-300">{card.title}</p>
              <p className="text-xs text-slate-500 font-mono">{card.description}</p>
            </div>
          </div>
          
          {/* Progress bar for fitness score */}
          {card.title === 'Average Fitness' && (
            <div className="mt-4">
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/50" 
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(metrics.avgFitness)))}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function App() {
  const [trainData, setTrainData] = useState([])
  const [systemStatus, setSystemStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // API request helper
  const makeApiRequest = async (endpoint, method = 'GET', data = null) => {
    try {
      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      }
      
      if (data) {
        config.body = JSON.stringify(data)
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
      return await response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const status = await makeApiRequest('/status')
      setSystemStatus(status)
    } catch (error) {
      setError('Failed to fetch system status')
    }
  }

  // Fetch train induction data
  const fetchTrainData = async () => {
    try {
      setLoading(true)
      const response = await makeApiRequest('/get_induction_list')
      if (response.status === 'success') {
        setTrainData(response.induction_list || [])
        setLastUpdate(new Date().toISOString())
      }
    } catch (error) {
      setError('Failed to fetch train data')
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh all data
  const refreshAllData = async () => {
    try {
      setLoading(true)
      await makeApiRequest('/refresh_data', 'GET')
      await fetchTrainData()
      await fetchSystemStatus()
    } catch (error) {
      setError('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  // Generate new predictions
  const generatePredictions = async () => {
    try {
      setLoading(true)
      await makeApiRequest('/predict_induction', 'POST', {
        use_mock_data: true,
        retrain_model: false,
        target_inductions: 25
      })
      await fetchTrainData()
    } catch (error) {
      setError('Failed to generate predictions')
    } finally {
      setLoading(false)
    }
  }

  // Apply manual override
  const applyOverride = async (trainId, decision, reason) => {
    try {
      await makeApiRequest('/override_train', 'POST', {
        train_id: trainId,
        decision: decision,
        reason: reason
      })
      await fetchTrainData() // Refresh data after override
      return true
    } catch (error) {
      setError('Failed to apply override')
      return false
    }
  }

  // Clear all overrides
  const clearOverrides = async () => {
    try {
      await makeApiRequest('/clear_overrides', 'DELETE')
      await fetchTrainData()
    } catch (error) {
      setError('Failed to clear overrides')
    }
  }

  // Auto-refresh effect
  useEffect(() => {
    let interval
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchTrainData()
        fetchSystemStatus()
      }, 300000) // 5 minutes
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  // Initial data load
  useEffect(() => {
    fetchSystemStatus()
    fetchTrainData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-50"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.1)_0%,transparent_50%)]"></div>
      
      <div className="relative z-10">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* System Status */}
          <SystemStatus 
            status={systemStatus}
            autoRefresh={autoRefresh}
            setAutoRefresh={setAutoRefresh}
            onRefresh={refreshAllData}
            onGeneratePredictions={generatePredictions}
            onClearOverrides={clearOverrides}
            loading={loading}
          />

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-300">System Error</h3>
                  <div className="mt-2 text-sm text-red-200">
                    <p className="font-mono">{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/30 border border-red-500/50 transition-colors"
                      onClick={() => setError(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metrics Cards */}
          <MetricsCards trainData={trainData} />

          {/* Charts Section */}
          <ChartsSection trainData={trainData} />

          {/* Train Data Table */}
          <TrainDataTable 
            trainData={trainData} 
            loading={loading}
            lastUpdate={lastUpdate}
          />

          {/* Manual Override */}
          <ManualOverride 
            trainData={trainData}
            onApplyOverride={applyOverride}
          />
        </div>
      </div>
    </div>
  )
}

export default App