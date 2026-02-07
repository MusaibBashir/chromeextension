const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    default: 'Not specified',
    trim: true
  },
  source: {
    type: String,
    required: true,
    enum: ['stackoverflow', 'ycombinator', 'wellfound', 'monster', 'linkedin'],
    lowercase: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  job_url: {
    type: String,
    required: true,
    unique: true  // Deduplication key
  },
  salary: {
    type: String,
    default: null
  },
  equity: {
    type: String,
    default: null
  },
  job_type: {
    type: String,  // full-time, part-time, contract, etc.
    default: null
  },
  remote: {
    type: Boolean,
    default: null
  },
  scraped_at: {
    type: Date,
    default: Date.now
  },
  raw_data: {
    type: mongoose.Schema.Types.Mixed,
    default: null  // Optional: store raw scraped data for debugging
  }
}, {
  timestamps: true
});

// Index for faster queries
jobSchema.index({ source: 1, scraped_at: -1 });
jobSchema.index({ company: 'text', title: 'text', skills: 'text' });

module.exports = mongoose.model('Job', jobSchema);
