const express = require('express');
const InductionPlan = require('../models/inductionPlan.model');
const Train = require('../models/train.model');
const { authenticateToken, requireSupervisor } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Configuration for AI service
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// All routes require authentication
router.use(authenticateToken);

// GET /api/induction/latest - Get latest induction plan
router.get('/latest', async (req, res) => {
  try {
    const plan = await InductionPlan.getLatest();
    
    if (!plan) {
      return res.status(404).json({
        error: 'No induction plan found',
        code: 'NO_PLAN_FOUND',
        suggestion: 'Generate a new plan using POST /api/induction/generate'
      });
    }

    res.json({
      plan,
      summary: plan.summary,
      topTrains: plan.getTopTrains(5),
      criticalAlerts: plan.getCriticalAlerts()
    });

  } catch (error) {
    console.error('Get latest plan error:', error);
    res.status(500).json({
      error: 'Failed to fetch latest plan',
      message: error.message
    });
  }
});

// GET /api/induction/history - Get plan history
router.get('/history', async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    const plans = await InductionPlan.getHistory(parseInt(limit));
    
    res.json({
      plans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: plans.length
      }
    });

  } catch (error) {
    console.error('Get plan history error:', error);
    res.status(500).json({
      error: 'Failed to fetch plan history',
      message: error.message
    });
  }
});

// GET /api/induction/explain/:planId - Get detailed explanation for a plan
router.get('/explain/:planId', async (req, res) => {
  try {
    const plan = await InductionPlan.findById(req.params.planId)
      .populate('rankedTrains.train')
      .populate('generatedBy', 'username role');
    
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        code: 'PLAN_NOT_FOUND'
      });
    }

    // Detailed explanation for each train
    const explanations = plan.rankedTrains.map(entry => ({
      rank: entry.rank,
      train: entry.train,
      reasoning: entry.reasoning,
      confidenceScore: entry.confidenceScore,
      constraints: entry.constraints,
      detailedAnalysis: {
        fitnessStatus: entry.train?.fitnessStatus?.isValid ? 'Valid' : 'Invalid',
        maintenanceUrgency: entry.train?.maintenanceUrgency,
        mileageBalance: entry.train?.currentMileage,
        brandingPriority: entry.train?.branding?.brandingPriority,
        locationAdvantage: entry.train?.currentLocation
      }
    }));

    res.json({
      plan: {
        id: plan._id,
        planDate: plan.planDate,
        generatedAt: plan.generatedAt,
        status: plan.status,
        generatedBy: plan.generatedBy
      },
      explanations,
      optimizationMetrics: plan.optimizationMetrics,
      aiModelInfo: plan.aiModelInfo,
      alerts: plan.alerts
    });

  } catch (error) {
    console.error('Get plan explanation error:', error);
    res.status(500).json({
      error: 'Failed to get plan explanation',
      message: error.message
    });
  }
});

// POST /api/induction/generate - Generate new induction plan
router.post('/generate', requireSupervisor, async (req, res) => {
  try {
    const { planDate = new Date(), forceRegenerate = false } = req.body;
    
    // Check if plan already exists for this date
    const existingPlan = await InductionPlan.findOne({ 
      planDate: new Date(planDate),
      status: 'FINALIZED'
    });
    
    if (existingPlan && !forceRegenerate) {
      return res.status(409).json({
        error: 'Plan already exists for this date',
        code: 'PLAN_EXISTS',
        existingPlan: existingPlan._id,
        suggestion: 'Use forceRegenerate: true to override'
      });
    }

    // Get all trains from MongoDB
    const trains = await Train.find().lean();
    
    if (trains.length === 0) {
      return res.status(400).json({
        error: 'No trains available for optimization',
        code: 'NO_TRAINS_AVAILABLE'
      });
    }

    console.log(`Found ${trains.length} trains in database for optimization`);

    // Format train data for AI service
    const formattedTrains = formatTrainsForAI(trains);

    // Call AI optimization service
    const aiResult = await callAIOptimizer(formattedTrains, req.body.constraints);
    
    // Create new induction plan
    const plan = new InductionPlan({
      planDate: new Date(planDate),
      rankedTrains: aiResult.rankedTrains,
      alerts: aiResult.alerts,
      optimizationMetrics: aiResult.metrics,
      generatedBy: req.user._id,
      aiModelInfo: aiResult.modelInfo,
      status: 'FINALIZED'
    });

    await plan.save();
    
    // Populate train references
    await plan.populate('rankedTrains.train');

    res.status(201).json({
      message: 'Induction plan generated successfully',
      plan,
      summary: plan.summary,
      processingTime: aiResult.metrics.processingTimeMs
    });

  } catch (error) {
    console.error('Generate plan error:', error);
    res.status(500).json({
      error: 'Failed to generate induction plan',
      message: error.message,
      details: error.response?.data || error.message
    });
  }
});

// POST /api/induction/simulate - Run what-if simulation
router.post('/simulate', requireSupervisor, async (req, res) => {
  try {
    const { trainId, modifications, baseDate = new Date() } = req.body;
    
    if (!trainId || !modifications) {
      return res.status(400).json({
        error: 'trainId and modifications are required',
        code: 'MISSING_SIMULATION_PARAMS'
      });
    }

    // Get current train data from MongoDB
    const trains = await Train.find().lean();
    const targetTrain = trains.find(t => 
      t.trainsetId === trainId || 
      t._id.toString() === trainId
    );
    
    if (!targetTrain) {
      return res.status(404).json({
        error: 'Train not found for simulation',
        code: 'TRAIN_NOT_FOUND'
      });
    }

    console.log(`Running simulation for train: ${trainId}`);

    // Format trains for AI service
    const formattedTrains = formatTrainsForAI(trains);

    // Call AI simulation service
    const aiResult = await callAISimulator(formattedTrains, trainId, modifications, req.body.constraints);
    
    res.json({
      message: 'Simulation completed successfully',
      simulation: {
        planDate: baseDate,
        rankedTrains: aiResult.rankedTrains,
        alerts: aiResult.alerts,
        optimizationMetrics: aiResult.metrics,
        status: 'SIMULATION',
        simulationParams: aiResult.simulationParams,
        impactAnalysis: aiResult.impactAnalysis
      }
    });

  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({
      error: 'Failed to run simulation',
      message: error.message,
      details: error.response?.data || error.message
    });
  }
});

// Helper function to format MongoDB train data for AI service
function formatTrainsForAI(trains) {
  return trains.map(train => ({
    // Core identifiers
    _id: train._id.toString(),
    trainsetId: train.trainsetId,
    
    // Fitness status
    fitnessStatus: {
      isValid: train.fitnessStatus?.isValid || false,
      expiryDate: train.fitnessStatus?.expiryDate,
      certificateNumber: train.fitnessStatus?.certificateNumber,
      inspectionDate: train.fitnessStatus?.inspectionDate,
      ...train.fitnessStatus
    },
    
    // Maintenance information
    maintenanceStatus: train.maintenanceStatus || 'UNKNOWN',
    maintenanceUrgency: train.maintenanceUrgency || 1,
    lastMaintenanceDate: train.lastMaintenanceDate,
    nextMaintenanceDate: train.nextMaintenanceDate,
    maintenanceDue: train.maintenanceDue || false,
    
    // Operational data
    currentMileage: train.currentMileage || 0,
    totalMileage: train.totalMileage || 0,
    currentLocation: train.currentLocation,
    isAvailableForService: train.isAvailableForService !== false,
    
    // Cleaning status
    cleaningStatus: train.cleaningStatus || 'UNKNOWN',
    lastCleaningDate: train.lastCleaningDate,
    
    // Branding information
    branding: {
      hasBranding: train.branding?.hasBranding || false,
      brandingPriority: train.branding?.brandingPriority || 1,
      brandType: train.branding?.brandType,
      brandingExpiryDate: train.branding?.brandingExpiryDate,
      ...train.branding
    },
    
    // Technical specifications
    trainType: train.trainType,
    manufacturer: train.manufacturer,
    yearManufactured: train.yearManufactured,
    capacity: train.capacity,
    
    // Operational history
    performanceScore: train.performanceScore || 0,
    reliabilityScore: train.reliabilityScore || 0,
    fuelEfficiency: train.fuelEfficiency || 0,
    
    // Status flags
    isOperational: train.maintenanceStatus === 'OPERATIONAL',
    hasValidFitness: train.fitnessStatus?.isValid || false,
    needsMaintenance: train.maintenanceDue || false,
    
    // Additional fields that might be useful for AI
    createdAt: train.createdAt,
    updatedAt: train.updatedAt,
    
    // Pass through any other fields
    ...train
  }));
}

// Helper function to call AI optimization service
async function callAIOptimizer(trains, constraints = {}) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/optimize`, {
      trains: trains,
      constraints: constraints
    }, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data) {
      // Map the response to match expected format
      return {
        rankedTrains: response.data.rankedTrains || [],
        alerts: response.data.alerts || [],
        metrics: response.data.metrics || {},
        modelInfo: response.data.modelInfo || { version: 'unknown' }
      };
    } else {
      throw new Error('Empty response from AI service');
    }

  } catch (error) {
    console.error('AI Service Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.warn('AI service unavailable, falling back to rule-based optimization');
      return fallbackOptimization(trains, constraints);
    }
    
    throw new Error(`AI optimization failed: ${error.message}`);
  }
}

// Helper function to call AI simulation service
async function callAISimulator(trains, trainId, modifications, constraints = {}) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/simulate`, {
      trains: trains,
      trainId: trainId,
      modifications: modifications,
      constraints: constraints
    }, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data) {
      return {
        rankedTrains: response.data.rankedTrains || [],
        alerts: response.data.alerts || [],
        metrics: response.data.metrics || {},
        modelInfo: response.data.modelInfo || { version: 'unknown' },
        simulationParams: response.data.simulationParams || {},
        impactAnalysis: response.data.impactAnalysis || {}
      };
    } else {
      throw new Error('Empty response from AI service');
    }

  } catch (error) {
    console.error('AI Simulation Service Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.warn('AI service unavailable, falling back to rule-based simulation');
      return fallbackSimulation(trains, trainId, modifications, constraints);
    }
    
    throw new Error(`AI simulation failed: ${error.message}`);
  }
}

// Fallback optimization when AI service is unavailable
function fallbackOptimization(trains, constraints = {}) {
  const startTime = Date.now();
  
  // Filter service-ready trains
  const serviceReadyTrains = trains.filter(train => {
    return train.fitnessStatus?.isValid && 
           train.maintenanceStatus === 'OPERATIONAL' && 
           train.isAvailableForService !== false;
  });

  // Simple scoring algorithm
  const scoredTrains = serviceReadyTrains.map(train => {
    let score = 0;
    
    // Fitness validity (high priority)
    if (train.fitnessStatus?.isValid) score += 30;
    
    // Maintenance status
    if (train.maintenanceStatus === 'OPERATIONAL') score += 25;
    if (!train.maintenanceDue) score += 10;
    
    // Mileage balance (prefer balanced mileage)
    const avgMileage = trains.reduce((sum, t) => sum + (t.currentMileage || 0), 0) / trains.length;
    const mileageDiff = Math.abs((train.currentMileage || 0) - avgMileage);
    score += Math.max(0, 15 - (mileageDiff / 1000)); // Reduce score for mileage imbalance
    
    // Branding priority
    if (train.branding?.hasBranding) {
      score += (train.branding.brandingPriority || 1) * 2;
    }
    
    // Performance and reliability
    score += (train.performanceScore || 0) * 0.1;
    score += (train.reliabilityScore || 0) * 0.1;
    
    // Cleaning status
    if (train.cleaningStatus === 'CLEAN') score += 5;
    
    return {
      train: train._id,
      score: Math.round(score),
      reasoning: generateReasoning(train, score)
    };
  });

  // Sort by score and create ranking
  const rankedTrains = scoredTrains
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      train: item.train,
      rank: index + 1,
      reasoning: item.reasoning,
      confidenceScore: Math.min(100, Math.max(60, item.score)), // Convert to 60-100 range
      constraints: {
        fitnessValid: true,
        maintenanceReady: true,
        cleaningStatus: 'CLEAN'
      }
    }));

  const alerts = generateAlerts(trains);
  
  return {
    rankedTrains,
    alerts,
    metrics: {
      totalTrainsEvaluated: trains.length,
      constraintsSatisfied: rankedTrains.length,
      averageConfidence: rankedTrains.reduce((sum, t) => sum + t.confidenceScore, 0) / rankedTrains.length,
      processingTimeMs: Date.now() - startTime
    },
    modelInfo: {
      version: '1.0-fallback',
      algorithm: 'Rule-Based Weighted Scoring (Fallback)',
      parameters: constraints
    }
  };
}

// Fallback simulation when AI service is unavailable
function fallbackSimulation(trains, trainId, modifications, constraints = {}) {
  // Apply modifications to the target train
  const modifiedTrains = trains.map(train => {
    if (train.trainsetId === trainId || train._id.toString() === trainId) {
      return { ...train, ...modifications };
    }
    return train;
  });

  // Run optimization with modified data
  const result = fallbackOptimization(modifiedTrains, constraints);
  
  // Analyze impact
  const modifiedTrainRank = result.rankedTrains.find(t => 
    t.train === trainId || t.train.toString() === trainId
  )?.rank;
  
  return {
    ...result,
    simulationParams: {
      modifiedTrain: trainId,
      modifications: modifications
    },
    impactAnalysis: {
      newRank: modifiedTrainRank,
      rankChange: modifiedTrainRank ? `Moved to rank ${modifiedTrainRank}` : 'Not in top rankings',
      affectedTrains: result.rankedTrains.length
    }
  };
}

// Helper function to generate reasoning
function generateReasoning(train, score) {
  const reasons = [];
  
  if (train.fitnessStatus?.isValid) {
    const expiryDate = train.fitnessStatus.expiryDate ? 
      new Date(train.fitnessStatus.expiryDate).toDateString() : 'Unknown';
    reasons.push(`Valid fitness certificate until ${expiryDate}`);
  }
  
  if (train.maintenanceStatus === 'OPERATIONAL') {
    reasons.push('Maintenance status: Operational');
  }
  
  if (train.currentMileage) {
    reasons.push(`Current mileage: ${train.currentMileage.toLocaleString()}km`);
  }
  
  if (train.branding?.hasBranding) {
    reasons.push(`Branding priority: ${train.branding.brandingPriority}/5`);
  }
  
  if (train.performanceScore) {
    reasons.push(`Performance score: ${train.performanceScore}/100`);
  }
  
  reasons.push(`Overall optimization score: ${score}`);
  
  return reasons.join('; ') || 'Selected based on optimization criteria';
}

// Helper function to generate alerts
function generateAlerts(trains) {
  const alerts = [];
  
  trains.forEach(train => {
    // Fitness expiry alerts
    if (train.fitnessStatus?.expiryDate) {
      const expiryDate = new Date(train.fitnessStatus.expiryDate);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
        alerts.push({
          type: 'CRITICAL',
          message: `${train.trainsetId} fitness certificate expires in ${daysUntilExpiry} days`,
          trainId: train.trainsetId,
          severity: 5
        });
      } else if (daysUntilExpiry <= 7 && daysUntilExpiry > 3) {
        alerts.push({
          type: 'WARNING',
          message: `${train.trainsetId} fitness certificate expires in ${daysUntilExpiry} days`,
          trainId: train.trainsetId,
          severity: 3
        });
      } else if (daysUntilExpiry < 0) {
        alerts.push({
          type: 'CRITICAL',
          message: `${train.trainsetId} fitness certificate has expired`,
          trainId: train.trainsetId,
          severity: 5
        });
      }
    }
    
    // Maintenance alerts
    if (train.maintenanceDue) {
      alerts.push({
        type: 'WARNING',
        message: `${train.trainsetId} maintenance is due`,
        trainId: train.trainsetId,
        severity: 4
      });
    }
    
    // Availability alerts
    if (train.isAvailableForService === false) {
      alerts.push({
        type: 'INFO',
        message: `${train.trainsetId} is not available for service`,
        trainId: train.trainsetId,
        severity: 2
      });
    }
  });
  
  return alerts.sort((a, b) => b.severity - a.severity); // Sort by severity
}

module.exports = router;