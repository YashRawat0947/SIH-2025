const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Train = require('../models/train.model');
const { authenticateToken, requireSupervisor } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept CSV and Excel files
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});

// All routes require authentication
router.use(authenticateToken);

// POST /api/data/upload - Handle file uploads
router.post('/upload', requireSupervisor, upload.single('dataFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        const { dataType = 'trains', updateMode = 'merge' } = req.body;

        // Validate file
        const validationResult = await validateUploadedFile(req.file.path, dataType);
        if (!validationResult.valid) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                error: 'File validation failed',
                code: 'VALIDATION_FAILED',
                details: validationResult.errors
            });
        }

        // Process file based on data type
        let result;
        switch (dataType) {
            case 'trains':
                result = await processTrainData(req.file.path, updateMode);
                break;
            case 'maintenance':
                result = await processMaintenanceData(req.file.path, updateMode);
                break;
            case 'fitness':
                result = await processFitnessData(req.file.path, updateMode);
                break;
            default:
                throw new Error(`Unsupported data type: ${dataType}`);
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            message: 'File processed successfully',
            result,
            file: {
                originalName: req.file.originalname,
                size: req.file.size,
                uploadedAt: new Date()
            }
        });

    } catch (error) {
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.error('File upload error:', error);
        res.status(500).json({
            error: 'File processing failed',
            message: error.message
        });
    }
});

// POST /api/data/validate - Validate data before processing
router.post('/validate', requireSupervisor, upload.single('dataFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        const { dataType = 'trains' } = req.body;

        const validationResult = await validateUploadedFile(req.file.path, dataType);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (validationResult.valid) {
            res.json({
                valid: true,
                message: 'File validation successful',
                preview: validationResult.preview,
                recordCount: validationResult.recordCount
            });
        } else {
            res.status(400).json({
                valid: false,
                errors: validationResult.errors,
                preview: validationResult.preview
            });
        }

    } catch (error) {
        // Clean up file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.error('File validation error:', error);
        res.status(500).json({
            error: 'File validation failed',
            message: error.message
        });
    }
});

// GET /api/data/template/:type - Download data template
router.get('/template/:type', (req, res) => {
    try {
        const { type } = req.params;

        const templates = {
            trains: {
                filename: 'train_data_template.csv',
                headers: [
                    'trainsetId',
                    'currentMileage',
                    'fitnessExpiryDate',
                    'maintenanceStatus',
                    'cleaningStatus',
                    'currentLocation',
                    'hasBranding',
                    'campaignDetails',
                    'brandingPriority'
                ]
            },
            maintenance: {
                filename: 'maintenance_template.csv',
                headers: [
                    'trainsetId',
                    'lastMaintenanceDate',
                    'nextMaintenanceDue',
                    'maintenanceStatus',
                    'totalOperationalHours'
                ]
            },
            fitness: {
                filename: 'fitness_template.csv',
                headers: [
                    'trainsetId',
                    'fitnessValid',
                    'expiryDate',
                    'lastInspectionDate'
                ]
            }
        };

        const template = templates[type];
        if (!template) {
            return res.status(404).json({
                error: 'Template not found',
                availableTypes: Object.keys(templates)
            });
        }

        // Generate CSV template
        const csvContent = template.headers.join(',') + '\n';

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Template download error:', error);
        res.status(500).json({
            error: 'Failed to generate template',
            message: error.message
        });
    }
});

// Helper function to validate uploaded file
async function validateUploadedFile(filePath, dataType) {
    return new Promise((resolve) => {
        const errors = [];
        const preview = [];
        let recordCount = 0;

        const requiredFields = {
            trains: ['trainsetId', 'currentMileage', 'currentLocation'],
            maintenance: ['trainsetId', 'maintenanceStatus'],
            fitness: ['trainsetId', 'fitnessValid', 'expiryDate']
        };

        const required = requiredFields[dataType] || requiredFields.trains;

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (headers) => {
                // Check required fields
                const missing = required.filter(field => !headers.includes(field));
                if (missing.length > 0) {
                    errors.push(`Missing required fields: ${missing.join(', ')}`);
                }
            })
            .on('data', (row) => {
                recordCount++;

                // Store first 5 rows for preview
                if (preview.length < 5) {
                    preview.push(row);
                }

                // Validate trainset ID format
                if (row.trainsetId && !/^TS-\d{2}$/.test(row.trainsetId)) {
                    errors.push(`Invalid trainset ID format: ${row.trainsetId} (should be TS-XX)`);
                }

                // Validate mileage
                if (row.currentMileage && (isNaN(row.currentMileage) || row.currentMileage < 0)) {
                    errors.push(`Invalid mileage for ${row.trainsetId}: ${row.currentMileage}`);
                }
            })
            .on('end', () => {
                resolve({
                    valid: errors.length === 0,
                    errors: errors.slice(0, 10), // Limit to first 10 errors
                    preview,
                    recordCount
                });
            })
            .on('error', (error) => {
                resolve({
                    valid: false,
                    errors: [`File parsing error: ${error.message}`],
                    preview: [],
                    recordCount: 0
                });
            });
    });
}

// Helper function to process train data
async function processTrainData(filePath, updateMode) {
    const results = {
        created: 0,
        updated: 0,
        errors: []
    };

    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', async (row) => {
                try {
                    const trainData = {
                        trainsetId: row.trainsetId,
                        currentMileage: parseInt(row.currentMileage) || 0,
                        currentLocation: row.currentLocation,
                        fitnessStatus: {
                            isValid: row.fitnessValid !== 'false',
                            expiryDate: row.fitnessExpiryDate ? new Date(row.fitnessExpiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                        },
                        maintenanceStatus: row.maintenanceStatus || 'OPERATIONAL',
                        cleaningStatus: row.cleaningStatus || 'CLEAN',
                        branding: {
                            hasBranding: row.hasBranding === 'true',
                            campaignDetails: row.campaignDetails || '',
                            brandingPriority: parseInt(row.brandingPriority) || 1
                        }
                    };

                    const existingTrain = await Train.findOne({ trainsetId: row.trainsetId });

                    if (existingTrain) {
                        if (updateMode === 'merge') {
                            Object.keys(trainData).forEach(key => {
                                if (trainData[key] !== undefined) {
                                    existingTrain[key] = trainData[key];
                                }
                            });
                            await existingTrain.save();
                            results.updated++;
                        }
                    } else {
                        const newTrain = new Train(trainData);
                        await newTrain.save();
                        results.created++;
                    }
                } catch (error) {
                    results.errors.push(`Error processing ${row.trainsetId}: ${error.message}`);
                }
            })
            .on('end', () => {
                resolve(results);
            });
    });
}

// Helper function to process maintenance data
async function processMaintenanceData(filePath, updateMode) {
    const results = { updated: 0, errors: [] };

    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', async (row) => {
                try {
                    const train = await Train.findOne({ trainsetId: row.trainsetId });
                    if (!train) {
                        results.errors.push(`Train not found: ${row.trainsetId}`);
                        return;
                    }

                    if (row.lastMaintenanceDate) {
                        train.lastMaintenanceDate = new Date(row.lastMaintenanceDate);
                    }
                    if (row.nextMaintenanceDue) {
                        train.nextMaintenanceDue = new Date(row.nextMaintenanceDue);
                    }
                    if (row.maintenanceStatus) {
                        train.maintenanceStatus = row.maintenanceStatus;
                    }
                    if (row.totalOperationalHours) {
                        train.totalOperationalHours = parseInt(row.totalOperationalHours);
                    }

                    await train.save();
                    results.updated++;
                } catch (error) {
                    results.errors.push(`Error updating ${row.trainsetId}: ${error.message}`);
                }
            })
            .on('end', () => {
                resolve(results);
            });
    });
}

// Helper function to process fitness data
async function processFitnessData(filePath, updateMode) {
    const results = { updated: 0, errors: [] };

    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', async (row) => {
                try {
                    const train = await Train.findOne({ trainsetId: row.trainsetId });
                    if (!train) {
                        results.errors.push(`Train not found: ${row.trainsetId}`);
                        return;
                    }

                    train.fitnessStatus = {
                        isValid: row.fitnessValid !== 'false',
                        expiryDate: new Date(row.expiryDate),
                        lastInspectionDate: row.lastInspectionDate ? new Date(row.lastInspectionDate) : train.fitnessStatus.lastInspectionDate
                    };

                    await train.save();
                    results.updated++;
                } catch (error) {
                    results.errors.push(`Error updating fitness for ${row.trainsetId}: ${error.message}`);
                }
            })
            .on('end', () => {
                resolve(results);
            });
    });
}

module.exports = router;