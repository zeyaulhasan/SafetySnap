/**
 * Real PPE detection using Roboflow Hosted Inference API
 *
 * Model: construction-site-safety/23  (Roboflow Universe — high accuracy)
 * Classes: Hardhat, Safety Vest, NO-Hardhat, NO-Safety Vest, Mask, NO-Mask, Person, vehicle
 *
 * Requires ROBOFLOW_API_KEY in backend/.env
 * Get a free key at: https://app.roboflow.com → Settings → API Keys
 */

const axios = require('axios');
const fs    = require('fs');

const RF_MODEL   = 'construction-site-safety';
const RF_VERSION = 23;
const CONFIDENCE = 15; // Lowered to 15% to catch more edge cases

// ─── Class names from construction-site-safety/23 → our internal labels ──────
// API returns: "Hardhat", "Safety Vest", "NO-Safety Vest", "NO-Mask", "Person", "vehicle"
// We compare lowercase, so keys here are all lowercase versions of those strings.
const LABEL_MAP = {
  // ✅ Compliant PPE
  'hardhat':          'helmet',
  'hard hat':         'helmet',
  'helmet':           'helmet',
  'safety vest':      'vest',
  'safety-vest':      'vest',
  'vest':             'vest',
  'hi-vis vest':      'vest',
  // ❌ Violations
  'no-hardhat':       'no_helmet',
  'no hardhat':       'no_helmet',
  'no helmet':        'no_helmet',
  'no-helmet':        'no_helmet',
  'no-safety vest':   'no_vest',   // ← "NO-Safety Vest" lowercased
  'no safety vest':   'no_vest',
  'no vest':          'no_vest',
  'no-vest':          'no_vest',
  // Ignore: 'person', 'no-mask', 'vehicle' (not PPE we track)
};

// ─── Image dimensions from file header (no extra deps) ───────────────────────
function getImageDimensions(buf) {
  try {
    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    // JPEG
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xFF) break;
        const m = buf[i + 1];
        if (m === 0xC0 || m === 0xC2) {
          return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch { /* fall through */ }
  return { w: 640, h: 640 };
}

// ─── Main detection function ──────────────────────────────────────────────────
async function detectPPE(imagePath) {
  const apiKey = process.env.ROBOFLOW_API_KEY;

  if (!apiKey || apiKey === 'your_roboflow_api_key_here') {
    console.warn('⚠️  No ROBOFLOW_API_KEY set — skipping detection.');
    return [];
  }

  try {
    const buf = fs.readFileSync(imagePath);
    const b64 = buf.toString('base64');
    const fallbackDims = getImageDimensions(buf);

    const url = `https://detect.roboflow.com/${RF_MODEL}/${RF_VERSION}` +
                `?api_key=${apiKey}&confidence=${CONFIDENCE}&overlap=30&format=json`;

    console.log(`🔍 Calling Roboflow: ${RF_MODEL} v${RF_VERSION} (image: ${(buf.length / 1024).toFixed(1)} KB)…`);

    const response = await axios({
      method:  'POST',
      url,
      data:    b64,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxBodyLength:    Infinity,
      maxContentLength: Infinity,
      timeout: 60000,
    });

    const data = response.data;

    if (!data || !data.predictions) {
      console.error('❌ Unexpected Roboflow response:', JSON.stringify(data).slice(0, 200));
      return [];
    }

    const imgW = data.image?.width  || fallbackDims.w;
    const imgH = data.image?.height || fallbackDims.h;
    console.log(`📐 Image: ${imgW}×${imgH}px  |  Raw predictions: ${data.predictions.length}`);

    const detections = data.predictions
      .map(p => {
        const rawClass = (p.class || '').toLowerCase().trim();
        const label    = LABEL_MAP[rawClass];

        if (!label) {
          // Log skipped classes so we can add them to LABEL_MAP if needed
          console.log(`   ↳ skipping class: "${p.class}" (${Math.round(p.confidence * 100)}%)`);
          return null;
        }

        // Roboflow x,y are center; convert to top-left, then normalize to 0-1
        const bx = Math.max(0, (p.x - p.width  / 2) / imgW);
        const by = Math.max(0, (p.y - p.height / 2) / imgH);
        const bw = Math.min(1 - bx, p.width  / imgW);
        const bh = Math.min(1 - by, p.height / imgH);

        return {
          label,
          confidence: parseFloat(p.confidence.toFixed(3)),
          bbox: { x: bx, y: by, width: bw, height: bh },
        };
      })
      .filter(Boolean);

    console.log(
      `✅ Mapped ${detections.length} detections:`,
      detections.map(d => `${d.label}(${Math.round(d.confidence * 100)}%)`).join(', ') || 'none'
    );
    return detections;

  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      console.error('❌ Roboflow API timed out (>60s)');
    } else if (err.code === 'ENOTFOUND') {
      console.error('❌ Cannot reach detect.roboflow.com — check internet connection');
    } else if (err.response) {
      console.error(
        `❌ Roboflow error ${err.response.status}:`,
        JSON.stringify(err.response.data).slice(0, 200)
      );
    } else {
      console.error('❌ detectPPE error:', err.message);
    }
    return [];
  }
}

module.exports = { detectPPE };
