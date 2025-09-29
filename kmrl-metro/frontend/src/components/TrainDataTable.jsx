import React, { useState, useMemo } from 'react'

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
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortConfig.direction === 'ascending' ? (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    )
  }

  const getDecisionBadge = (decision) => {
    if (decision === 'Induct') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Induct
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ✗ Hold
        </span>
      )
    }
  }

  const getFitnessColor = (score) => {
    if (score >= 90) return 'text-green-600 font-semibold'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600 font-semibold'
  }

  const formatReasoning = (reasoning) => {
    if (!reasoning) return 'No reasoning available'
    
    // Add emojis and formatting
    let formatted = reasoning
    if (reasoning.includes('fitness score')) formatted = '💪 ' + formatted
    else if (reasoning.includes('work order')) formatted = '🔧 ' + formatted
    else if (reasoning.includes('certificate')) formatted = '📋 ' + formatted
    else if (reasoning.includes('manual override')) formatted = '👤 ' + formatted
    
    return formatted
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-500">Loading train data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Train Induction List</h2>
        {lastUpdate && (
          <p className="text-sm text-gray-500">
            Last updated: {new Date(lastUpdate).toLocaleString()}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Decision
          </label>
          <select
            value={filters.decision}
            onChange={(e) => setFilters({...filters, decision: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="All">All Decisions</option>
            <option value="Induct">Induct</option>
            <option value="Hold">Hold</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Depot
          </label>
          <select
            value={filters.depot}
            onChange={(e) => setFilters({...filters, depot: e.target.value})}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="All">All Depots</option>
            {uniqueDepots.map(depot => (
              <option key={depot} value={depot}>{depot}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Fitness Score
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.minFitness}
            onChange={(e) => setFilters({...filters, minFitness: parseInt(e.target.value)})}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span className="font-medium">{filters.minFitness}%</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredAndSortedData.length} of {trainData?.length || 0} trains
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 train-table">
          <thead>
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('train_id')}
              >
                <div className="flex items-center space-x-1">
                  <span>Train ID</span>
                  {getSortIcon('train_id')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('final_decision')}
              >
                <div className="flex items-center space-x-1">
                  <span>Decision</span>
                  {getSortIcon('final_decision')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('fitness_score')}
              >
                <div className="flex items-center space-x-1">
                  <span>Fitness</span>
                  {getSortIcon('fitness_score')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('depot')}
              >
                <div className="flex items-center space-x-1">
                  <span>Depot</span>
                  {getSortIcon('depot')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('mileage')}
              >
                <div className="flex items-center space-x-1">
                  <span>Mileage</span>
                  {getSortIcon('mileage')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Work Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cert Valid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reasoning
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedData.map((train, index) => (
              <tr 
                key={train.train_id || index}
                className={`hover:bg-gray-50 ${
                  train.final_decision === 'Induct' ? 'table-row-induct' : 'table-row-hold'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {train.train_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getDecisionBadge(train.final_decision)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={getFitnessColor(train.fitness_score || 0)}>
                    {(train.fitness_score || 0).toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {train.depot || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(train.mileage || 0).toLocaleString()} km
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    (train.open_work_orders || 0) > 0 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {train.open_work_orders || 0}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    train.cert_valid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {train.cert_valid ? '✓ Valid' : '✗ Invalid'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                  <div className="truncate" title={train.reasoning}>
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
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No trains found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters to see more results.
          </p>
        </div>
      )}
    </div>
  )
}

export default TrainDataTable