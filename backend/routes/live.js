const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const { detectPPE } = require('../utils/detectPPE');
const { generateSafetyReport } = require('../utils/geminiAnalyzer');

/**
 * @route   POST /api/live/detect-frame
 * @desc    Process a single base64 video frame for real-time inference (no DB save)
 * @access  Private
 */
router.post('/detect-frame', auth, async (req, res) => {
  try {
    const { image } = req.body; // base64 string

    if (!image) {
      return res.status(400).json({ message: 'No image frame provided' });
    }

    // Strip the "data:image/jpeg;base64," prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save to a temporary file
    const tempFileName = `live-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    const tempFilePath = path.join(__dirname, '../uploads', tempFileName);
    
    fs.writeFileSync(tempFilePath, buffer);

    // Run inference
    const detections = await detectPPE(tempFilePath);

    // Delete temp file immediately to save space
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // Return detections only
    res.json({ detections });

  } catch (err) {
    console.error('Live inference error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   POST /api/live/analyze-snapshot
 * @desc    Process a single base64 video frame for deep analysis (Roboflow + Gemini)
 * @access  Private
 */
router.post('/analyze-snapshot', auth, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image frame provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const tempFileName = `snapshot-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    const tempFilePath = path.join(__dirname, '../uploads', tempFileName);
    
    fs.writeFileSync(tempFilePath, buffer);

    // Run BOTH inference pipelines concurrently
    const [detections, aiAnalysisData] = await Promise.all([
      detectPPE(tempFilePath),
      generateSafetyReport(tempFilePath)
    ]);

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    res.json({
      detections,
      aiAnalysis: aiAnalysisData ? (typeof aiAnalysisData === 'string' ? aiAnalysisData : aiAnalysisData.english) : null,
      aiAnalysisHindi: aiAnalysisData ? (typeof aiAnalysisData === 'string' ? null : aiAnalysisData.hindi) : null,
      createdAt: new Date()
    });

  } catch (err) {
    console.error('Snapshot analysis error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
