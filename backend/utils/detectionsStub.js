/**
 * Stub detection function that returns hardcoded bounding boxes
 * In a real application, this would be replaced with actual ML model inference
 * 
 * @returns {Array} Array of detection objects with normalized coordinates (0-1)
 */
const generateDetections = () => {
  // Randomly decide if the image has a helmet, vest, both, or neither
  const hasHelmet = Math.random() > 0.3; // 70% chance of having a helmet
  const hasVest = Math.random() > 0.4; // 60% chance of having a vest
  
  const detections = [];
  
  if (hasHelmet) {
    detections.push({
      label: 'helmet',
      confidence: 0.7 + Math.random() * 0.25, // Confidence between 0.7 and 0.95
      bbox: {
        x: 0.3 + Math.random() * 0.1, // x between 0.3 and 0.4
        y: 0.1 + Math.random() * 0.1, // y between 0.1 and 0.2
        width: 0.15 + Math.random() * 0.05, // width between 0.15 and 0.2
        height: 0.15 + Math.random() * 0.05 // height between 0.15 and 0.2
      }
    });
  }
  
  if (hasVest) {
    detections.push({
      label: 'vest',
      confidence: 0.65 + Math.random() * 0.3, // Confidence between 0.65 and 0.95
      bbox: {
        x: 0.3 + Math.random() * 0.1, // x between 0.3 and 0.4
        y: 0.4 + Math.random() * 0.1, // y between 0.4 and 0.5
        width: 0.3 + Math.random() * 0.1, // width between 0.3 and 0.4
        height: 0.3 + Math.random() * 0.1 // height between 0.3 and 0.4
      }
    });
  }
  
  return detections;
};

module.exports = { generateDetections };