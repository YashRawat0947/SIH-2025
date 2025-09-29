import React from 'react'
import { Bar, Pie, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const ChartsSection = ({ trainData }) => {
  // Fitness Score Chart Data
  const getFitnessChartData = () => {
    if (!trainData || trainData.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    const sortedData = [...trainData].sort((a, b) => (b.fitness_score || 0) - (a.fitness_score || 0))
    
    return {
      labels: sortedData.map(train => train.train_id),
      datasets: [
        {
          label: 'Fitness Score',
          data: sortedData.map(train => train.fitness_score || 0),
          backgroundColor: sortedData.map(train => 
            train.final_decision === 'Induct' ? '#10b981' : '#ef4444'
          ),
          borderColor: sortedData.map(train => 
            train.final_decision === 'Induct' ? '#059669' : '#dc2626'
          ),
          borderWidth: 1,
        },
      ],
    }
  }

  // Depot Distribution Chart Data
  const getDepotChartData = () => {
    if (!trainData || trainData.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    const depotCounts = trainData.reduce((acc, train) => {
      const depot = train.depot || 'Unknown'
      acc[depot] = (acc[depot] || 0) + 1
      return acc
    }, {})

    return {
      labels: Object.keys(depotCounts),
      datasets: [
        {
          data: Object.values(depotCounts),
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6',
          ],
          borderColor: [
            '#2563eb',
            '#059669',
            '#d97706',
            '#dc2626',
            '#7c3aed',
          ],
          borderWidth: 2,
        },
      ],
    }
  }

  // Decision Summary Chart Data
  const getDecisionChartData = () => {
    if (!trainData || trainData.length === 0) {
      return {
        labels: [],
        datasets: []
      }
    }

    const decisionCounts = trainData.reduce((acc, train) => {
      const decision = train.final_decision || 'Unknown'
      acc[decision] = (acc[decision] || 0) + 1
      return acc
    }, {})

    return {
      labels: Object.keys(decisionCounts),
      datasets: [
        {
          data: Object.values(decisionCounts),
          backgroundColor: ['#10b981', '#ef4444', '#6b7280'],
          borderColor: ['#059669', '#dc2626', '#4b5563'],
          borderWidth: 2,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1', // slate-300
          font: {
            family: 'monospace'
          }
        }
      },
    },
  }

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#94a3b8', // slate-400
          callback: function(value) {
            return value + '%'
          }
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          color: '#94a3b8' // slate-400
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Fitness: ${context.parsed.y}%`
          }
        }
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Fitness Score Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 font-mono">
          Train Fitness Scores
        </h3>
        <div className="h-80">
          <Bar data={getFitnessChartData()} options={barChartOptions} />
        </div>
        <div className="mt-4 flex items-center justify-center space-x-4 text-xs font-mono">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>
            <span className="text-slate-400">INDUCT</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>
            <span className="text-slate-400">HOLD</span>
          </div>
        </div>
      </div>

      {/* Depot Distribution Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 font-mono">
          Train Distribution by Depot
        </h3>
        <div className="h-80">
          <Pie data={getDepotChartData()} options={chartOptions} />
        </div>
      </div>

      {/* Decision Summary Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 font-mono">
          Induction Decision Summary
        </h3>
        <div className="h-80">
          <Doughnut data={getDecisionChartData()} options={chartOptions} />
        </div>
      </div>

      {/* Fleet Health Summary */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4 font-mono">
          Fleet Health Overview
        </h3>
        <div className="space-y-4">
          {trainData && trainData.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300 font-mono">Excellent (90%+)</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {trainData.filter(t => (t.fitness_score || 0) >= 90).length} trains
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300 font-mono">Good (80-89%)</span>
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {trainData.filter(t => (t.fitness_score || 0) >= 80 && (t.fitness_score || 0) < 90).length} trains
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300 font-mono">Fair (70-79%)</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {trainData.filter(t => (t.fitness_score || 0) >= 70 && (t.fitness_score || 0) < 80).length} trains
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300 font-mono">Poor (&lt;70%)</span>
                <span className="text-sm font-bold text-red-400 font-mono">
                  {trainData.filter(t => (t.fitness_score || 0) < 70).length} trains
                </span>
              </div>
              
              <div className="pt-4 border-t border-slate-700/50">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-900/80 to-slate-800/80 rounded-lg border border-cyan-500/30">
                  <span className="text-sm font-medium text-white font-mono">Average Fleet Fitness</span>
                  <span className="text-2xl font-bold text-cyan-400 font-mono">
                    {trainData.length > 0 
                      ? (trainData.reduce((sum, t) => sum + (t.fitness_score || 0), 0) / trainData.length).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChartsSection