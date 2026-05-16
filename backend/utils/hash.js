const crypto = require('crypto');
const fs = require('fs');

/**
 * Generate SHA256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - Hash of the file
 */
const generateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

/**
 * Generate hash for detection results
 * @param {Array} detections - Array of detection objects
 * @returns {string} - Hash of the detections
 */
const generateDetectionsHash = (detections) => {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(detections));
  return hash.digest('hex');
};

module.exports = {
  generateFileHash,
  generateDetectionsHash
};