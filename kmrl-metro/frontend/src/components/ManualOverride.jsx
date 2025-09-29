import React, { useState } from 'react'

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
      // Reset form
      setSelectedTrain('')
      setReason('Manual override by operator')
      setIsOpen(false)
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Manual Override</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isOpen ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide Override Panel
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Apply Manual Override
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-gray-200 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Train Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Train
                </label>
                <select
                  value={selectedTrain}
                  onChange={(e) => setSelectedTrain(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a train...</option>
                  {trainData && trainData.map(train => (
                    <option key={train.train_id} value={train.train_id}>
                      {train.train_id} - {train.final_decision} (Fitness: {(train.fitness_score || 0).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Override Decision */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Override Decision
                </label>
                <select
                  value={overrideDecision}
                  onChange={(e) => setOverrideDecision(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="Induct">Induct</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter reason for override..."
                  required
                />
              </div>
            </div>

            {/* Selected Train Info */}
            {selectedTrain && trainData && (
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Train Information</h4>
                {(() => {
                  const train = trainData.find(t => t.train_id === selectedTrain)
                  if (!train) return <p className="text-sm text-gray-500">Train not found</p>
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current Decision:</span>
                        <div className={`font-medium ${train.final_decision === 'Induct' ? 'text-green-600' : 'text-red-600'}`}>
                          {train.final_decision}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Fitness Score:</span>
                        <div className="font-medium">{(train.fitness_score || 0).toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Depot:</span>
                        <div className="font-medium">{train.depot || 'Unknown'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Work Orders:</span>
                        <div className="font-medium">{train.open_work_orders || 0}</div>
                      </div>
                      <div className="md:col-span-4">
                        <span className="text-gray-500">Current Reasoning:</span>
                        <div className="font-medium text-xs mt-1">{train.reasoning}</div>
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
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedTrain}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply Override
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Warning Message */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Manual Override Warning
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Manual overrides supersede AI recommendations and business rules. 
                    Please ensure you have valid operational reasons for this override. 
                    All overrides are logged for audit purposes.
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

export default ManualOverride