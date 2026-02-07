const mongoose = require('mongoose');

const syncStateSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'n8n_sync'
    },
    lastSyncAt: {
        type: Date,
        default: null
    },
    lastSyncCount: {
        type: Number,
        default: 0
    },
    totalSynced: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SyncState', syncStateSchema);
