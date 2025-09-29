import React from 'react'

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
      color: 'text-green-600',
      bgColor: 'bg-green-100',
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
      color: 'text-red-600',
      bgColor: 'bg-red-100',
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
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
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Pending maintenance'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 metric-card">
          <div className="flex items-center">
            <div className={`flex-shrink-0 p-3 rounded-md ${card.bgColor}`}>
              <div className={card.color}>
                {card.icon}
              </div>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {card.value}
                </h3>
              </div>
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-xs text-gray-500">{card.description}</p>
            </div>
          </div>
          
          {/* Progress bar for fitness score */}
          {card.title === 'Average Fitness' && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
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

export default MetricsCards