const mongoose = require('mongoose');

const inductionPlanSchema = new mongoose.Schema({
  planDate: {
    type: Date,
    required: true,
    unique: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  // AI optimization results
  rankedTrains: [{
    train: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Train',
      required: true
    },
    rank: {
      type: Number,
      required: true,
      min: 1
    },
    reasoning: {
      type: String,
      required: true,
      // e.g., "Selected due to balanced mileage (4,850km) and valid fitness certificate until 2024-12-15"
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85
    },
    constraints: {
      fitnessValid: Boolean,
      maintenanceReady: Boolean,
      cleaningStatus: String,
      brandingPriority: Number,
      mileageBalance: Number
    }
  }],
  
  // System alerts and warnings
  alerts: [{
    type: {
      type: String,
      enum: ['WARNING', 'CRITICAL', 'INFO'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    trainId: {
      type: String
    },
    severity: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    }
  }],
  
  // Plan status
  status: {
    type: String,
    enum: ['FINALIZED', 'SIMULATION', 'DRAFT'],
    default: 'FINALIZED'
  },
  
  // Optimization metrics
  optimizationMetrics: {
    totalTrainsEvaluated: {
      type: Number,
      default: 0
    },
    constraintsSatisfied: {
      type: Number,
      default: 0
    },
    averageConfidence: {
      type: Number,
      default: 0
    },
    processingTimeMs: {
      type: Number,
      default: 0
    }
  },
  
  // What-if simulation data (if applicable)
  simulationParams: {
    modifiedTrain: {
      type: String
    },
    modifiedField: {
      type: String
    },
    originalValue: {
      type: mongoose.Schema.Types.Mixed
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  
  // User who generated this plan
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // AI model version/info
  aiModelInfo: {
    version: {
      type: String,
      default: '1.0'
    },
    algorithm: {
      type: String,
      default: 'Multi-Objective Optimization'
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }
}, {
  timestamps: true
});

// Virtual for plan summary
inductionPlanSchema.virtual('summary').get(function() {
  return {
    totalTrains: this.rankedTrains.length,
    criticalAlerts: this.alerts.filter(alert => alert.type === 'CRITICAL').length,
    averageConfidence: this.optimizationMetrics.averageConfidence,
    status: this.status
  };
});

// Method to get top N trains
inductionPlanSchema.methods.getTopTrains = function(n = 5) {
  return this.rankedTrains
    .sort((a, b) => a.rank - b.rank)
    .slice(0, n);
};

// Method to get critical alerts
inductionPlanSchema.methods.getCriticalAlerts = function() {
  return this.alerts.filter(alert => alert.type === 'CRITICAL');
};

// Static method to get latest plan WITH POPULATION
inductionPlanSchema.statics.getLatest = function() {
  return this.findOne({ status: 'FINALIZED' })
             .sort({ planDate: -1 })
             .populate({
               path: 'rankedTrains.train',
               select: 'trainsetId model manufacturer fitnessStatus maintenanceStatus cleaningStatus branding currentMileage'
             })
             .populate('generatedBy', 'username role');
};

// Static method to get plan history WITH POPULATION
inductionPlanSchema.statics.getHistory = function(limit = 10) {
  return this.find({ status: 'FINALIZED' })
             .sort({ planDate: -1 })
             .limit(limit)
             .select('planDate generatedAt optimizationMetrics.averageConfidence alerts status rankedTrains')
             .populate({
               path: 'rankedTrains.train',
               select: 'trainsetId'
             })
             .populate('generatedBy', 'username');
};

module.exports = mongoose.model('InductionPlan', inductionPlanSchema);