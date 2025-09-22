const express = require('express');
const Train = require('../models/train.model');
const { authenticateToken, requireSupervisor } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/trains - Get all trains
router.get('/', async (req, res) => {
  try {
    const trains = await Train.find(); // fetch all trains

    res.json({
      trains,
      total: trains.length
    });
  } catch (error) {
    console.error('Error fetching trains:', error);
    res.status(500).json({ error: 'Failed to fetch trains' });
  }
});


// GET /api/trains/constraints - Get current constraint violations
router.get('/constraints', async (req, res) => {
  try {
    const trains = await Train.find();
    
    const constraints = {
      fitnessExpiring: [],
      maintenanceDue: [],
      cleaningDue: [],
      unavailable: []
    };

    trains.forEach(train => {
      // Fitness expiring in next 7 days
      const daysUntilFitnessExpiry = Math.floor(
        (train.fitnessStatus.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilFitnessExpiry <= 7) {
        constraints.fitnessExpiring.push({
          trainId: train.trainsetId,
          expiryDate: train.fitnessStatus.expiryDate,
          daysRemaining: daysUntilFitnessExpiry
        });
      }

      // Maintenance due
      if (train.maintenanceStatus === 'MAINTENANCE_DUE') {
        constraints.maintenanceDue.push({
          trainId: train.trainsetId,
          urgency: train.maintenanceUrgency,
          daysSinceLast: train.daysSinceLastMaintenance
        });
      }

      // Cleaning due
      if (train.cleaningStatus === 'CLEANING_DUE') {
        constraints.cleaningDue.push({
          trainId: train.trainsetId,
          location: train.currentLocation
        });
      }

      // Unavailable for service
      if (!train.isServiceReady()) {
        constraints.unavailable.push({
          trainId: train.trainsetId,
          reasons: [
            !train.fitnessStatus.isValid && 'Invalid fitness',
            train.maintenanceStatus !== 'OPERATIONAL' && 'Maintenance required',
            !train.isAvailableForService && 'Not available'
          ].filter(Boolean)
        });
      }
    });

    res.json({
      summary: {
        totalTrains: trains.length,
        serviceReady: trains.filter(t => t.isServiceReady()).length,
        constraintViolations: Object.values(constraints).reduce((sum, arr) => sum + arr.length, 0)
      },
      constraints
    });

  } catch (error) {
    console.error('Get constraints error:', error);
    res.status(500).json({
      error: 'Failed to fetch constraints',
      message: error.message
    });
  }
});

// GET /api/trains/:trainId - Get specific train
router.get('/:trainId', async (req, res) => {
  try {
    const train = await Train.findOne({ trainsetId: req.params.trainId });
    
    if (!train) {
      return res.status(404).json({
        error: 'Train not found',
        code: 'TRAIN_NOT_FOUND'
      });
    }

    res.json({
      train,
      serviceReady: train.isServiceReady(),
      maintenanceUrgency: train.maintenanceUrgency,
      daysSinceLastMaintenance: train.daysSinceLastMaintenance
    });

  } catch (error) {
    console.error('Get train error:', error);
    res.status(500).json({
      error: 'Failed to fetch train',
      message: error.message
    });
  }
});

// POST /api/trains - Add new train
router.post('/', requireSupervisor, async (req, res) => {
  try {
    const trainData = req.body;

    // Validate trainset ID format
    if (!trainData.trainsetId || !/^TS-\d{2}$/.test(trainData.trainsetId)) {
      return res.status(400).json({
        error: 'Invalid trainset ID format. Use TS-XX (e.g., TS-01)',
        code: 'INVALID_TRAINSET_ID'
      });
    }

    // Check if train already exists
    const existingTrain = await Train.findOne({ trainsetId: trainData.trainsetId });
    if (existingTrain) {
      return res.status(409).json({
        error: 'Train with this ID already exists',
        code: 'TRAIN_EXISTS'
      });
    }

    const train = new Train(trainData);
    await train.save();

    res.status(201).json({
      message: 'Train added successfully',
      train
    });

  } catch (error) {
    console.error('Add train error:', error);
    res.status(500).json({
      error: 'Failed to add train',
      message: error.message
    });
  }
});

// PUT /api/trains/:trainId - Update train data
router.put('/:trainId', requireSupervisor, async (req, res) => {
  try {
    const train = await Train.findOne({ trainsetId: req.params.trainId });
    
    if (!train) {
      return res.status(404).json({
        error: 'Train not found',
        code: 'TRAIN_NOT_FOUND'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'trainsetId') { // Don't allow changing train ID
        train[key] = req.body[key];
      }
    });

    await train.save();

    res.json({
      message: 'Train updated successfully',
      train
    });

  } catch (error) {
    console.error('Update train error:', error);
    res.status(500).json({
      error: 'Failed to update train',
      message: error.message
    });
  }
});

// DELETE /api/trains/:trainId - Remove train
router.delete('/:trainId', requireSupervisor, async (req, res) => {
  try {
    const train = await Train.findOneAndDelete({ trainsetId: req.params.trainId });
    
    if (!train) {
      return res.status(404).json({
        error: 'Train not found',
        code: 'TRAIN_NOT_FOUND'
      });
    }

    res.json({
      message: 'Train removed successfully',
      trainId: req.params.trainId
    });

  } catch (error) {
    console.error('Delete train error:', error);
    res.status(500).json({
      error: 'Failed to remove train',
      message: error.message
    });
  }
});

module.exports = router;