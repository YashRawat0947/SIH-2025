const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema({
    trainsetId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        // Format: TS-01, TS-02, etc.
        match: /^TS-\d{2}$/
    },
    currentMileage: {
        type: Number,
        required: true,
        min: 0
    },
    fitnessStatus: {
        isValid: {
            type: Boolean,
            required: true,
            default: true
        },
        expiryDate: {
            type: Date,
            required: true
        },
        lastInspectionDate: {
            type: Date
        }
    },
    branding: {
        hasBranding: {
            type: Boolean,
            default: false
        },
        campaignDetails: {
            type: String,
            default: ''
        },
        brandingPriority: {
            type: Number,
            min: 1,
            max: 5,
            default: 1
        }
    },
    maintenanceStatus: {
        type: String,
        enum: ['OPERATIONAL', 'MAINTENANCE_DUE', 'IN_MAINTENANCE'],
        default: 'OPERATIONAL'
    },
    cleaningStatus: {
        type: String,
        enum: ['CLEAN', 'CLEANING_DUE'],
        default: 'CLEAN'
    },
    currentLocation: {
        type: String,
        required: true,
        // e.g., 'Yard A, Line 3', 'Depot B'
    },

    // Enhanced fields for AI decision making
    lastMaintenanceDate: {
        type: Date
    },
    nextMaintenanceDue: {
        type: Date
    },
    totalOperationalHours: {
        type: Number,
        default: 0,
        min: 0
    },
    priorityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
        // Used by AI for ranking explanations
    },

    // Operational constraints
    isAvailableForService: {
        type: Boolean,
        default: true
    },
    lastServiceDate: {
        type: Date,
        default: Date.now
    },

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Virtual for days since last maintenance
trainSchema.virtual('daysSinceLastMaintenance').get(function () {
    if (!this.lastMaintenanceDate) return null;
    const diffTime = Date.now() - this.lastMaintenanceDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// My logic to determine maintenance urgency levels
trainSchema.virtual('maintenanceUrgency').get(function () {
    if (!this.nextMaintenanceDue) return 'LOW';
    const daysUntilDue = Math.floor((this.nextMaintenanceDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 0) return 'CRITICAL';
    if (daysUntilDue <= 3) return 'HIGH';
    if (daysUntilDue <= 7) return 'MEDIUM';
    return 'LOW';
});

// Method to check if train is service ready
trainSchema.methods.isServiceReady = function () {
    return this.fitnessStatus.isValid &&
        this.maintenanceStatus === 'OPERATIONAL' &&
        this.isAvailableForService &&
        this.fitnessStatus.expiryDate > new Date();
};

// Static method to get trains by priority
trainSchema.statics.getByPriority = function () {
    return this.find({ isAvailableForService: true })
        .sort({ priorityScore: -1, currentMileage: 1 });
};

module.exports = mongoose.model('Train', trainSchema);