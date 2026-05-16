const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const authorizeRole = require('../middleware/authorize');
const Image   = require('../models/Image');
const path    = require('path');

/**
 * @route   GET /api/analytics/summary
 * @desc    Full analytics summary — compliance, violations, trend, risk profile, sites
 * @access  Private (Managers & Admins only)
 */
router.get('/summary', [auth, authorizeRole('manager', 'admin')], async (req, res) => {
  try {
    const userId = req.user.id;
    // Admins and managers see all images across the org. If we had an orgId, we'd filter by that.
    // For now, they see everything.
    const filter = req.user.role === 'admin' || req.user.role === 'manager' ? {} : { userId };

    // ── Total images ──────────────────────────────────────────────────────────
    const allImages = await Image.find(filter).lean();
    const totalImages = allImages.length;

    if (totalImages === 0) {
      return res.json({
        totalImages: 0,
        helmetCompliance: 0,
        vestCompliance: 0,
        totalViolations: 0,
        violationBreakdown: { no_helmet: 0, no_vest: 0 },
        totalWorkersDetected: 0,
        dailyTrend: [],
        sites: [],
        bestImage: null,
        worstImage: null,
        weeklyComparison: { thisWeek: 0, lastWeek: 0 },
      });
    }

    // ── Per-image compliance stats ────────────────────────────────────────────
    let imagesWithHelmet  = 0;
    let imagesWithVest    = 0;
    let totalViolations   = 0;
    let noHelmetCount     = 0;
    let noVestCount       = 0;
    let workersDetected   = 0;
    let bestScore         = -1;
    let worstScore        = Infinity;
    let bestImage         = null;
    let worstImage        = null;

    for (const img of allImages) {
      const dets = img.detections || [];
      const compliant   = dets.filter(d => d.label === 'helmet' || d.label === 'vest').length;
      const violations  = dets.filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
      const total       = compliant + violations;
      const score       = total > 0 ? (compliant / total) * 100 : null;

      if (dets.some(d => d.label === 'helmet')) imagesWithHelmet++;
      if (dets.some(d => d.label === 'vest'))   imagesWithVest++;

      noHelmetCount += dets.filter(d => d.label === 'no_helmet').length;
      noVestCount   += dets.filter(d => d.label === 'no_vest').length;
      totalViolations += violations;
      workersDetected += Math.max(
        dets.filter(d => d.label === 'helmet' || d.label === 'no_helmet').length,
        dets.filter(d => d.label === 'vest'   || d.label === 'no_vest').length,
        total > 0 ? 1 : 0
      );

      if (score !== null) {
        if (score > bestScore) { bestScore = score; bestImage = img; }
        if (score < worstScore) { worstScore = score; worstImage = img; }
      }
    }

    const helmetCompliance = Math.round((imagesWithHelmet / totalImages) * 100);
    const vestCompliance   = Math.round((imagesWithVest   / totalImages) * 100);

    // ── Weekly comparison ─────────────────────────────────────────────────────
    const now       = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const prevStart = new Date(now); prevStart.setDate(now.getDate() - 14);

    const thisWeekViolations = allImages
      .filter(img => new Date(img.createdAt) >= weekStart)
      .reduce((s, img) => s + (img.detections || []).filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length, 0);

    const lastWeekViolations = allImages
      .filter(img => new Date(img.createdAt) >= prevStart && new Date(img.createdAt) < weekStart)
      .reduce((s, img) => s + (img.detections || []).filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length, 0);

    // ── Site breakdown ────────────────────────────────────────────────────────
    const siteMap = {};
    for (const img of allImages) {
      const site = img.siteName || 'Untagged';
      if (!siteMap[site]) siteMap[site] = { name: site, total: 0, violations: 0 };
      siteMap[site].total++;
      siteMap[site].violations += (img.detections || []).filter(d => d.label === 'no_helmet' || d.label === 'no_vest').length;
    }
    const sites = Object.values(siteMap).sort((a, b) => b.total - a.total);

    // ── Daily trend (last 14 days) ────────────────────────────────────────────
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const dailyImages = await Image.aggregate([
      { $match: { ...filter, createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
          count: { $sum: 1 },
          helmetCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $filter: { input: '$detections', as: 'd', cond: { $eq: ['$$d.label', 'helmet'] } } } }, 0] }, 1, 0]
            }
          },
          vestCount: {
            $sum: {
              $cond: [{ $gt: [{ $size: { $filter: { input: '$detections', as: 'd', cond: { $eq: ['$$d.label', 'vest'] } } } }, 0] }, 1, 0]
            }
          },
          violations: {
            $sum: {
              $size: {
                $filter: {
                  input: '$detections', as: 'd',
                  cond: { $in: ['$$d.label', ['no_helmet', 'no_vest']] }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          totalCount: '$count',
          violations: '$violations',
          helmetCompliance: { $multiply: [{ $divide: ['$helmetCount', '$count'] }, 100] },
          vestCompliance:   { $multiply: [{ $divide: ['$vestCount',   '$count'] }, 100] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // ── Response ──────────────────────────────────────────────────────────────
    res.json({
      totalImages,
      helmetCompliance,
      vestCompliance,
      totalViolations,
      violationBreakdown: { no_helmet: noHelmetCount, no_vest: noVestCount },
      totalWorkersDetected: workersDetected,
      dailyTrend: dailyImages,
      sites,
      bestImage:  bestImage  ? { id: bestImage._id,  filePath: bestImage.filePath,  siteName: bestImage.siteName,  score: Math.round(bestScore) }  : null,
      worstImage: worstImage ? { id: worstImage._id, filePath: worstImage.filePath, siteName: worstImage.siteName, score: Math.round(worstScore) } : null,
      weeklyComparison: { thisWeek: thisWeekViolations, lastWeek: lastWeekViolations },
    });

  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;