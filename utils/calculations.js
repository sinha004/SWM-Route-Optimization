// Utility functions for calculations

/**
 * Calculate Haversine distance between two coordinates (straight line)
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
export const calculateHaversineDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted string (e.g., "12.34 km" or "850 m")
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(2)} km`;
};

/**
 * Format time duration
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted string (e.g., "1h 30m" or "45m")
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Format currency (INR)
 * @param {number} amount - Amount in INR
 * @returns {string} Formatted string (e.g., "₹1,234.56")
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format weight
 * @param {number} weightKg - Weight in kilograms
 * @returns {string} Formatted string (e.g., "1.2 tons" or "500 kg")
 */
export const formatWeight = (weightKg) => {
  if (weightKg >= 1000) {
    return `${(weightKg / 1000).toFixed(2)} tons`;
  }
  return `${weightKg.toFixed(1)} kg`;
};

/**
 * Calculate fill level color
 * @param {number} fillLevel - Fill level percentage (0-100)
 * @returns {string} Color code
 */
export const getFillLevelColor = (fillLevel) => {
  if (fillLevel >= 80) return '#ef4444'; // red
  if (fillLevel >= 60) return '#f59e0b'; // amber
  if (fillLevel >= 40) return '#eab308'; // yellow
  return '#10b981'; // green
};

/**
 * Calculate priority score for a bin
 * @param {Object} dustbin - Dustbin object with fillLevel, wasteType, lastUpdated
 * @returns {number} Priority score (higher = more urgent)
 */
export const calculateBinPriority = (dustbin) => {
  const { fillLevel = 0, wasteType = 'general', lastUpdated } = dustbin;
  
  let score = fillLevel; // Base score from fill level
  
  // Waste type priority multiplier
  const wastePriorityMultipliers = {
    medical: 2.0,
    hazardous: 1.8,
    biodegradable: 1.5,
    general: 1.0,
    recyclable: 0.8,
    'e-waste': 0.7
  };
  score *= wastePriorityMultipliers[wasteType] || 1.0;
  
  // Time-based urgency (bins not updated for long time get higher priority)
  if (lastUpdated) {
    const daysSinceUpdate = (Date.now() - new Date(lastUpdated)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7) score *= 1.3;
    else if (daysSinceUpdate > 3) score *= 1.1;
  }
  
  return Math.min(score, 300); // Cap at 300
};

/**
 * Group bins by location clusters using simple grid-based clustering
 * @param {Array} bins - Array of bin objects
 * @param {number} gridSize - Size of grid cells in degrees (default 0.01 ≈ 1.1km)
 * @returns {Array} Array of bin clusters
 */
export const clusterBinsByLocation = (bins, gridSize = 0.01) => {
  const clusters = {};
  
  bins.forEach(bin => {
    const gridX = Math.floor(bin.lat / gridSize);
    const gridY = Math.floor(bin.lng / gridSize);
    const key = `${gridX},${gridY}`;
    
    if (!clusters[key]) {
      clusters[key] = [];
    }
    clusters[key].push(bin);
  });
  
  return Object.values(clusters);
};

/**
 * Calculate moving average for forecasting
 * @param {Array} data - Array of numbers
 * @param {number} windowSize - Window size for moving average
 * @returns {number} Moving average value
 */
export const calculateMovingAverage = (data, windowSize = 7) => {
  if (data.length === 0) return 0;
  const validData = data.slice(-windowSize);
  return validData.reduce((sum, val) => sum + val, 0) / validData.length;
};

/**
 * Detect anomalies in data
 * @param {number} currentValue - Current value to check
 * @param {Array} historicalData - Historical data array
 * @param {number} threshold - Standard deviation threshold (default 2)
 * @returns {boolean} True if anomaly detected
 */
export const detectAnomaly = (currentValue, historicalData, threshold = 2) => {
  if (historicalData.length < 3) return false;
  
  const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
  const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.abs(currentValue - mean) > threshold * stdDev;
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
export const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Generate date range array
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Array of date strings
 */
export const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate).toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};
