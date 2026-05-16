const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true,
    unique: true
  },
  detections: [
    {
      label: {
        type: String,
        required: true,
        enum: ['helmet', 'vest', 'no_helmet', 'no_vest']
      },
      confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      },
      bbox: {
        x: Number,  // Normalized coordinates (0-1)
        y: Number,
        width: Number,
        height: Number
      }
    }
  ],
  detectionsHash: {
    type: String
  },
  siteName: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  aiAnalysis: {
    type: String,
    default: null
  },
  aiAnalysisHindi: {
    type: String,
    default: null
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolutionNote: {
    type: String,
    default: ''
  },
  resolvedBy: {
    type: String,
    default: '' // Storing username or fullName for simplicity
  },
  resolvedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Image', ImageSchema);