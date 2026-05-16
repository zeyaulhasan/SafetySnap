const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/authorize');
const Image = require('../models/Image');
const { generateFileHash, generateDetectionsHash } = require('../utils/hash');
const { detectPPE } = require('../utils/detectPPE');
const { sendViolationAlert } = require('../utils/emailService');
const { generateSafetyReport } = require('../utils/geminiAnalyzer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @route   POST /api/images/upload
 * @desc    Upload an image and generate detections
 * @access  Private
 */
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const filePath = req.file.path;

    // Generate file hash for deduplication
    const fileHash = await generateFileHash(filePath);

    // Check if this image has been uploaded before
    const existingImage = await Image.findOne({ fileHash });
    const apiKeySet = !!(process.env.ROBOFLOW_API_KEY && process.env.ROBOFLOW_API_KEY !== 'your_roboflow_api_key_here');
    if (existingImage) {
      // If we have cached detections AND aiAnalysis, return them.
      // Otherwise, re-run whatever is missing.
      if (existingImage.detections && existingImage.detections.length > 0 && existingImage.aiAnalysis) {
        fs.unlinkSync(filePath);
        return res.status(200).json({
          message: 'Image already exists',
          apiAttempted: true,
          image: {
            id: existingImage._id,
            filePath: existingImage.filePath,
            fileHash: existingImage.fileHash,
            detections: existingImage.detections,
            detectionsHash: existingImage.detectionsHash,
            aiAnalysis: existingImage.aiAnalysis,
            aiAnalysisHindi: existingImage.aiAnalysisHindi,
            createdAt: existingImage.createdAt
          }
        });
      }

      // Stale cache — re-run detection and analysis on the new copy of the file
      console.log('🔄 Re-running analysis on previously cached image…');
      const [freshDetections, freshAiAnalysis] = await Promise.all([
        detectPPE(filePath),
        generateSafetyReport(filePath)
      ]);
      const freshHash = generateDetectionsHash(freshDetections);

      // Update the existing record with fresh data
      existingImage.detections = freshDetections;
      existingImage.detectionsHash = freshHash;
      if (freshAiAnalysis) {
        existingImage.aiAnalysis = typeof freshAiAnalysis === 'string' ? freshAiAnalysis : freshAiAnalysis.english;
        existingImage.aiAnalysisHindi = typeof freshAiAnalysis === 'string' ? null : freshAiAnalysis.hindi;
      }
      await existingImage.save();

      fs.unlinkSync(filePath);
      return res.status(200).json({
        message: 'Image re-analyzed',
        apiAttempted: apiKeySet,
        image: {
          id: existingImage._id,
          filePath: existingImage.filePath,
          fileHash: existingImage.fileHash,
          detections: freshDetections,
          detectionsHash: freshHash,
          aiAnalysis: existingImage.aiAnalysis,
          aiAnalysisHindi: existingImage.aiAnalysisHindi,
          createdAt: existingImage.createdAt
        }
      });
    }

    // Run REAL ML detection and Gemini Analysis concurrently
    const [detections, aiAnalysis] = await Promise.all([
      detectPPE(filePath),
      generateSafetyReport(filePath)
    ]);

    console.log(`✅ Detection complete: ${detections.length} items found`);

    // Generate hash for detections
    const detectionsHash = generateDetectionsHash(detections);

    // Upload to Cloudinary
    console.log('☁️ Uploading to Cloudinary...');
    const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
      folder: 'safetysnap',
    });
    
    const finalFilePath = cloudinaryResult.secure_url;

    // Delete temporary local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Create new image record
    const newImage = new Image({
      userId: req.user.id,
      filePath: finalFilePath,
      fileHash,
      detections,
      detectionsHash,
      siteName: (req.body.siteName || '').trim().slice(0, 100),
      aiAnalysis: aiAnalysis ? (typeof aiAnalysis === 'string' ? aiAnalysis : aiAnalysis.english) : null,
      aiAnalysisHindi: aiAnalysis ? (typeof aiAnalysis === 'string' ? null : aiAnalysis.hindi) : null
    });

    await newImage.save();

    // Check for violations and trigger email
    const compliantCount = detections.filter(d => d.label === 'helmet' || d.label === 'vest').length;
    const violationCount = detections.filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
    if (violationCount > 0) {
      const siteName = (req.body.siteName || '').trim().slice(0, 100);
      const imageUrl = `${process.env.FRONTEND_URL}/gallery`; // In production, this would be a deep link
      sendViolationAlert({
        to: req.user.email,
        siteName,
        violations: violationCount,
        compliant: compliantCount,
        imageUrl
      }).catch(err => console.error("Email alert error:", err));
    }

    res.status(201).json({
      message: 'Image uploaded successfully',
      apiAttempted: apiKeySet,
      image: {
        id: newImage._id,
        filePath: newImage.filePath,
        fileHash: newImage.fileHash,
        detections: newImage.detections,
        detectionsHash: newImage.detectionsHash,
        siteName: newImage.siteName,
        aiAnalysis: newImage.aiAnalysis,
        aiAnalysisHindi: newImage.aiAnalysisHindi,
        createdAt: newImage.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/images
 * @desc    Get all images with pagination and filters
 * @access  Private (Managers & Admins only)
 */
router.get('/', [auth, authorizeRole('manager', 'admin')], async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const sortField = req.query.sort || 'newest'; // newest | most_violations | highest_compliance

    // Build filter (managers and admins see all images)
    const filter = {};
    if (req.query.label)    filter['detections.label'] = req.query.label;
    if (req.query.site)     filter['siteName'] = req.query.site;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
    }

    // Sort
    let sortOption = { createdAt: -1 };
    if (sortField === 'most_violations') {
      // We'll sort in memory after fetching — MongoDB doesn't easily sort by array-filtered count
      sortOption = { createdAt: -1 };
    }

    let images = await Image.find(filter).sort(sortOption).lean();
    const total = images.length;

    // In-memory sort for complex sorts
    if (sortField === 'most_violations') {
      images.sort((a, b) => {
        const va = (a.detections || []).filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
        const vb = (b.detections || []).filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
        return vb - va;
      });
    } else if (sortField === 'highest_compliance') {
      images.sort((a, b) => {
        const score = img => {
          const dets = img.detections || [];
          const c = dets.filter(d => d.label === 'helmet' || d.label === 'vest').length;
          const t = dets.length;
          return t === 0 ? -1 : c / t;
        };
        return score(b) - score(a);
      });
    }

    // Paginate
    images = images.slice(offset, offset + limit);

    const formattedImages = images.map(image => {
      const dets = image.detections || [];
      const compliantCount  = dets.filter(d => d.label === 'helmet' || d.label === 'vest').length;
      const violationCount  = dets.filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
      const complianceScore = dets.length > 0 ? Math.round((compliantCount / dets.length) * 100) : null;
      return {
        id: image._id,
        filePath: image.filePath,
        fileHash: image.fileHash,
        detections: image.detections,
        detectionsHash: image.detectionsHash,
        siteName: image.siteName || '',
        aiAnalysis: image.aiAnalysis || null,
        aiAnalysisHindi: image.aiAnalysisHindi || null,
        resolved: image.resolved || false,
        resolutionNote: image.resolutionNote || '',
        resolvedBy: image.resolvedBy || '',
        resolvedAt: image.resolvedAt || null,
        createdAt: image.createdAt,
        violationCount,
        complianceScore,
      };
    });

    res.json({
      images: formattedImages,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Error fetching images:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/images/:id
 * @desc    Get image by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const image = await Image.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Format response to match required structure
    const formattedImage = {
      id: image._id,
      filePath: image.filePath,
      fileHash: image.fileHash,
      detections: image.detections,
      detectionsHash: image.detectionsHash,
      createdAt: image.createdAt
    };

    res.json(formattedImage);
  } catch (err) {
    console.error('Error fetching image:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/images/:id
 * @desc    Delete an image
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Check if user owns this image
    if (image.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this image' });
    }

    // Delete file from filesystem (if it's a legacy local file)
    if (!image.filePath.startsWith('http')) {
      const localFilePath = path.join(__dirname, '../uploads', image.filePath);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } else {
      // It's a Cloudinary URL, delete from Cloudinary
      try {
        const urlParts = image.filePath.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const filename = filenameWithExt.split('.')[0];
        const publicId = `safetysnap/${filename}`;
        
        await cloudinary.uploader.destroy(publicId);
        console.log(`☁️ Deleted ${publicId} from Cloudinary`);
      } catch (cloudErr) {
        console.error('☁️ Cloudinary delete error:', cloudErr.message);
      }
    }

    // Delete from database
    await Image.deleteOne({ _id: image._id });

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Image not found' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   PUT /api/images/:id/resolve
 * @desc    Mark an image violation as resolved
 * @access  Private (Managers & Admins only)
 */
router.put('/:id/resolve', [auth, authorizeRole('manager', 'admin')], async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    image.resolved = true;
    image.resolutionNote = resolutionNote || '';
    image.resolvedBy = req.user.username || 'Manager';
    image.resolvedAt = new Date();

    await image.save();

    res.json({
      message: 'Image marked as resolved',
      image: {
        id: image._id,
        resolved: image.resolved,
        resolutionNote: image.resolutionNote,
        resolvedBy: image.resolvedBy,
        resolvedAt: image.resolvedAt
      }
    });
  } catch (err) {
    console.error('Resolve error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;