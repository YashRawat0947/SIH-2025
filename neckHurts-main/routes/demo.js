const express = require('express');
const Train = require('../models/train.model');
const User = require('../models/user.model');
const InductionPlan = require('../models/inductionPlan.model');
const { authenticateToken, requireSupervisor } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/demo/sample-data - Generate sample data for demo
router.get('/sample-data', requireSupervisor, async (req, res) => {
  try {
    const { trainCount = 20, includePlans = true } = req.query;
    
    // Check if sample data already exists
    const existingTrains = await Train.countDocuments();
    if (existingTrains > 0) {
      return res.status(409).json({
        error: 'Sample data already exists',
        code: 'DATA_EXISTS',
        existingTrains,
        suggestion: 'Use POST /api/demo/reset to clear existing data first'
      });
    }

    // Generate sample trains
    const sampleTrains = generateSampleTrains(parseInt(trainCount));
    const createdTrains = await Train.insertMany(sampleTrains);

    let createdPlans = [];
    if (includePlans === 'true') {
      // Generate sample induction plans
      const samplePlans = await generateSamplePlans(createdTrains, req.user._id);
      createdPlans = await InductionPlan.insertMany(samplePlans);
    }

    res.json({
      message: 'Sample data generated successfully',
      data: {
        trains: {
          count: createdTrains.length,
          operational: createdTrains.filter(t => t.maintenanceStatus === 'OPERATIONAL').length,
          maintenanceDue: createdTrains.filter(t => t.maintenanceStatus === 'MAINTENANCE_DUE').length,
          withBranding: createdTrains.filter(t => t.branding.hasBranding).length
        },
        plans: {
          count: createdPlans.length
        }
      },
      demoScenarios: [
        'Fleet overview with mixed statuses',
        'Constraint violations (fitness expiring, maintenance due)',
        'AI optimization with explainable decisions',
        'What-if simulation scenarios',
        'Branding priority management'
      ]
    });

  } catch (error) {
    console.error('Sample data generation error:', error);
    res.status(500).json({
      error: 'Failed to generate sample data',
      message: error.message
    });
  }
});

// POST /api/demo/reset - Reset all data for fresh demo
router.post('/reset', requireSupervisor, async (req, res) => {
  try {
    const { confirmReset } = req.body;
    
    if (!confirmReset) {
      return res.status(400).json({
        error: 'Reset confirmation required',
        code: 'CONFIRMATION_REQUIRED',
        message: 'Send { "confirmReset": true } to proceed with data reset'
      });
    }

    // Count existing data
    const trainCount = await Train.countDocuments();
    const planCount = await InductionPlan.countDocuments();

    // Delete all data (except users)
    await Train.deleteMany({});
    await InductionPlan.deleteMany({});

    res.json({
      message: 'Demo data reset successfully',
      deletedData: {
        trains: trainCount,
        plans: planCount
      },
      nextSteps: [
        'Generate new sample data: GET /api/demo/sample-data',
        'Or upload your own data: POST /api/data/upload'
      ]
    });

  } catch (error) {
    console.error('Demo reset error:', error);
    res.status(500).json({
      error: 'Failed to reset demo data',
      message: error.message
    });
  }
});

// GET /api/demo/scenarios - Get predefined demo scenarios
router.get('/scenarios', (req, res) => {
  const scenarios = [
    {
      id: 'optimal_fleet',
      name: 'Optimal Fleet Scenario',
      description: 'All trains operational with balanced constraints',
      setup: {
        trainsOperational: '100%',
        fitnessValid: '100%',
        cleaningStatus: 'Mixed',
        brandingDistribution: 'Balanced'
      }
    },
    {
      id: 'constraint_violations',
      name: 'Constraint Violations',
      description: 'Multiple constraint violations requiring AI optimization',
      setup: {
        fitnessExpiring: '3 trains',
        maintenanceDue: '2 trains',
        cleaningDue: '4 trains',
        brandingConflicts: 'High priority campaigns'
      }
    },
    {
      id: 'maintenance_crisis',
      name: 'Maintenance Crisis',
      description: 'Critical maintenance situation testing AI prioritization',
      setup: {
        criticalMaintenance: '5 trains',
        operationalTrains: '60%',
        urgentFitness: '2 trains expiring today'
      }
    },
    {
      id: 'branding_optimization',
      name: 'Branding Campaign Optimization',
      description: 'High-value branding campaigns requiring optimal exposure',
      setup: {
        highPriorityBranding: '8 trains',
        campaignDeadlines: 'Mixed urgency',
        exposureTargets: 'Route-specific requirements'
      }
    }
  ];

  res.json({
    scenarios,
    usage: 'Use POST /api/demo/apply-scenario/:scenarioId to apply a scenario'
  });
});

// POST /api/demo/apply-scenario/:scenarioId - Apply a demo scenario
router.post('/apply-scenario/:scenarioId', requireSupervisor, async (req, res) => {
  try {
    const { scenarioId } = req.params;
    
    // Clear existing data
    await Train.deleteMany({});
    await InductionPlan.deleteMany({});

    let trains;
    switch (scenarioId) {
      case 'optimal_fleet':
        trains = generateOptimalFleetScenario();
        break;
      case 'constraint_violations':
        trains = generateConstraintViolationsScenario();
        break;
      case 'maintenance_crisis':
        trains = generateMaintenanceCrisisScenario();
        break;
      case 'branding_optimization':
        trains = generateBrandingOptimizationScenario();
        break;
      default:
        return res.status(404).json({
          error: 'Scenario not found',
          availableScenarios: ['optimal_fleet', 'constraint_violations', 'maintenance_crisis', 'branding_optimization']
        });
    }

    const createdTrains = await Train.insertMany(trains);
    
    // Generate an induction plan for the scenario
    const samplePlan = await generateSamplePlans(createdTrains, req.user._id, 1);
    const createdPlan = await InductionPlan.insertMany(samplePlan);

    res.json({
      message: `Scenario '${scenarioId}' applied successfully`,
      scenario: {
        id: scenarioId,
        trainsCreated: createdTrains.length,
        planGenerated: createdPlan.length > 0
      },
      demoTips: getDemoTipsForScenario(scenarioId)
    });

  } catch (error) {
    console.error('Apply scenario error:', error);
    res.status(500).json({
      error: 'Failed to apply scenario',
      message: error.message
    });
  }
});

// Helper function to generate sample trains
function generateSampleTrains(count) {
  const trains = [];
  const locations = ['Yard A, Line 1', 'Yard B, Line 2', 'Depot Central', 'Maintenance Bay', 'Platform 3'];
  const campaigns = ['Metro Bank Campaign', 'Tourism Board', 'Tech Conference 2024', 'Health Awareness', 'Education Initiative'];

  for (let i = 1; i <= count; i++) {
    const trainId = `TS-${i.toString().padStart(2, '0')}`;
    const fitnessExpiryDays = Math.floor(Math.random() * 60) + 1; // 1-60 days
    const maintenanceStatuses = ['OPERATIONAL', 'MAINTENANCE_DUE', 'IN_MAINTENANCE'];
    const cleaningStatuses = ['CLEAN', 'CLEANING_DUE'];

    trains.push({
      trainsetId: trainId,
      currentMileage: Math.floor(Math.random() * 8000) + 2000, // 2000-10000 km
      fitnessStatus: {
        isValid: Math.random() > 0.1, // 90% valid
        expiryDate: new Date(Date.now() + fitnessExpiryDays * 24 * 60 * 60 * 1000),
        lastInspectionDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
      },
      branding: {
        hasBranding: Math.random() > 0.6, // 40% have branding
        campaignDetails: Math.random() > 0.6 ? campaigns[Math.floor(Math.random() * campaigns.length)] : '',
        brandingPriority: Math.floor(Math.random() * 5) + 1
      },
      maintenanceStatus: maintenanceStatuses[Math.floor(Math.random() * maintenanceStatuses.length)],
      cleaningStatus: cleaningStatuses[Math.floor(Math.random() * cleaningStatuses.length)],
      currentLocation: locations[Math.floor(Math.random() * locations.length)],
      lastMaintenanceDate: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
      nextMaintenanceDue: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      totalOperationalHours: Math.floor(Math.random() * 5000) + 1000,
      priorityScore: Math.floor(Math.random() * 50) + 50, // 50-100
      isAvailableForService: Math.random() > 0.05 // 95% available
    });
  }

  return trains;
}

// Helper function to generate sample induction plans
async function generateSamplePlans(trains, userId, count = 3) {
  const plans = [];
  
  for (let i = 0; i < count; i++) {
    const planDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000); // Last 3 days
    
    // Select random trains for ranking
    const selectedTrains = trains
      .filter(t => t.maintenanceStatus === 'OPERATIONAL')
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(10, trains.length));

    const rankedTrains = selectedTrains.map((train, index) => ({
      train: train._id,
      rank: index + 1,
      reasoning: `Selected for optimal mileage balance (${train.currentMileage}km) and operational status`,
      confidenceScore: Math.floor(Math.random() * 20) + 80,
      constraints: {
        fitnessValid: train.fitnessStatus.isValid,
        maintenanceReady: train.maintenanceStatus === 'OPERATIONAL',
        cleaningStatus: train.cleaningStatus,
        brandingPriority: train.branding.brandingPriority,
        mileageBalance: train.currentMileage
      }
    }));

    plans.push({
      planDate,
      rankedTrains,
      alerts: generateSampleAlerts(trains),
      optimizationMetrics: {
        totalTrainsEvaluated: trains.length,
        constraintsSatisfied: selectedTrains.length,
        averageConfidence: 87,
        processingTimeMs: Math.floor(Math.random() * 2000) + 500
      },
      generatedBy: userId,
      status: 'FINALIZED'
    });
  }

  return plans;
}

// Scenario generators
function generateOptimalFleetScenario() {
  return generateSampleTrains(15).map(train => ({
    ...train,
    maintenanceStatus: 'OPERATIONAL',
    fitnessStatus: { ...train.fitnessStatus, isValid: true },
    cleaningStatus: 'CLEAN',
    isAvailableForService: true
  }));
}

function generateConstraintViolationsScenario() {
  const trains = generateSampleTrains(18);
  // Introduce specific violations
  trains[0].fitnessStatus.expiryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
  trains[1].fitnessStatus.expiryDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day
  trains[2].maintenanceStatus = 'MAINTENANCE_DUE';
  trains[3].maintenanceStatus = 'MAINTENANCE_DUE';
  trains[4].cleaningStatus = 'CLEANING_DUE';
  trains[5].cleaningStatus = 'CLEANING_DUE';
  return trains;
}

function generateMaintenanceCrisisScenario() {
  const trains = generateSampleTrains(20);
  // Create maintenance crisis
  for (let i = 0; i < 8; i++) {
    trains[i].maintenanceStatus = i < 5 ? 'MAINTENANCE_DUE' : 'IN_MAINTENANCE';
    if (i < 2) {
      trains[i].fitnessStatus.expiryDate = new Date(); // Expired today
    }
  }
  return trains;
}

function generateBrandingOptimizationScenario() {
  const trains = generateSampleTrains(16);
  const highValueCampaigns = ['Premium Bank Launch', 'Major Tech Conference', 'Government Initiative'];
  
  // Assign high-priority branding
  for (let i = 0; i < 8; i++) {
    trains[i].branding = {
      hasBranding: true,
      campaignDetails: highValueCampaigns[i % highValueCampaigns.length],
      brandingPriority: 4 + (i % 2) // Priority 4-5
    };
  }
  return trains;
}

function generateSampleAlerts(trains) {
  const alerts = [];
  
  trains.forEach(train => {
    const daysUntilFitnessExpiry = Math.floor(
      (train.fitnessStatus.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilFitnessExpiry <= 1) {
      alerts.push({
        type: 'CRITICAL',
        message: `${train.trainsetId} fitness certificate expires in ${daysUntilFitnessExpiry} day(s)`,
        trainId: train.trainsetId,
        severity: 5
      });
    } else if (daysUntilFitnessExpiry <= 7) {
      alerts.push({
        type: 'WARNING',
        message: `${train.trainsetId} fitness certificate expires in ${daysUntilFitnessExpiry} days`,
        trainId: train.trainsetId,
        severity: 3
      });
    }
    
    if (train.maintenanceStatus === 'MAINTENANCE_DUE') {
      alerts.push({
        type: 'WARNING',
        message: `${train.trainsetId} requires maintenance`,
        trainId: train.trainsetId,
        severity: 4
      });
    }
  });
  
  return alerts.slice(0, 10); // Limit alerts
}

function getDemoTipsForScenario(scenarioId) {
  const tips = {
    optimal_fleet: [
      'Show smooth AI optimization with minimal conflicts',
      'Demonstrate balanced mileage distribution',
      'Highlight branding exposure optimization'
    ],
    constraint_violations: [
      'Point out critical alerts in the dashboard',
      'Show how AI handles conflicting constraints',
      'Demonstrate explainable AI reasoning'
    ],
    maintenance_crisis: [
      'Emphasize AI prioritization under pressure',
      'Show safety-first decision making',
      'Demonstrate what-if scenarios for recovery'
    ],
    branding_optimization: [
      'Highlight revenue optimization features',
      'Show campaign exposure tracking',
      'Demonstrate ROI-focused AI decisions'
    ]
  };
  
  return tips[scenarioId] || ['General demo tips not available'];
}

module.exports = router;