// Waste generation forecasting and analytics

import { calculateMovingAverage, detectAnomaly, generateDateRange } from './calculations';

/**
 * Forecast waste generation for next N days using moving average
 * @param {Array} historicalData - Array of {date, weight} objects
 * @param {number} daysToForecast - Number of days to forecast
 * @param {number} windowSize - Moving average window size
 * @returns {Array} Forecast array
 */
export const forecastWasteGeneration = (historicalData, daysToForecast = 7, windowSize = 7) => {
  if (!historicalData || historicalData.length < windowSize) {
    return [];
  }

  // Sort by date
  const sorted = [...historicalData].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Extract weights
  const weights = sorted.map(d => d.weight);
  
  // Calculate moving average
  const avgDaily = calculateMovingAverage(weights, windowSize);
  
  // Calculate trend
  const recentWeights = weights.slice(-windowSize);
  const olderWeights = weights.slice(-windowSize * 2, -windowSize);
  const recentAvg = calculateMovingAverage(recentWeights, windowSize);
  const olderAvg = calculateMovingAverage(olderWeights, windowSize);
  const trend = recentAvg - olderAvg;
  
  // Generate forecast
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const forecast = [];
  
  for (let i = 1; i <= daysToForecast; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    // Simple linear trend extrapolation
    const forecastValue = Math.max(0, avgDaily + (trend * i));
    
    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      weight: forecastValue,
      isForecast: true
    });
  }
  
  return forecast;
};

/**
 * Detect bins that are filling faster than usual
 * @param {Object} bin - Bin object with collectionHistory
 * @param {number} threshold - Standard deviation threshold
 * @returns {boolean} True if anomaly detected
 */
export const detectBinAnomaly = (bin, threshold = 2) => {
  if (!bin.collectionHistory || bin.collectionHistory.length < 3) {
    return false;
  }

  // Calculate fill rates (weight per day)
  const fillRates = bin.collectionHistory.map((record, index) => {
    if (index === 0) return record.weight;
    const prevRecord = bin.collectionHistory[index - 1];
    const daysDiff = (new Date(record.timestamp) - new Date(prevRecord.timestamp)) / (1000 * 60 * 60 * 24);
    return daysDiff > 0 ? (record.weight - prevRecord.weight) / daysDiff : 0;
  });

  const currentFillRate = bin.weight / Math.max(1, (Date.now() - new Date(bin.lastUpdated)) / (1000 * 60 * 60 * 24));
  
  return detectAnomaly(currentFillRate, fillRates, threshold);
};

/**
 * Calculate waste type distribution
 * @param {Array} bins - Array of bin objects
 * @returns {Object} Distribution by waste type
 */
export const calculateWasteTypeDistribution = (bins) => {
  const distribution = {};
  let totalWeight = 0;

  bins.forEach(bin => {
    const wasteType = bin.wasteType || 'general';
    const weight = bin.weight || 0;
    
    if (!distribution[wasteType]) {
      distribution[wasteType] = {
        count: 0,
        totalWeight: 0,
        avgFillLevel: 0
      };
    }
    
    distribution[wasteType].count += 1;
    distribution[wasteType].totalWeight += weight;
    distribution[wasteType].avgFillLevel += (bin.fillLevel || 0);
    totalWeight += weight;
  });

  // Calculate percentages and averages
  Object.keys(distribution).forEach(type => {
    distribution[type].percentage = totalWeight > 0 ? (distribution[type].totalWeight / totalWeight) * 100 : 0;
    distribution[type].avgFillLevel = distribution[type].count > 0 ? distribution[type].avgFillLevel / distribution[type].count : 0;
  });

  return distribution;
};

/**
 * Calculate collection frequency recommendations
 * @param {Array} bins - Array of bin objects
 * @param {Array} collectionHistory - Historical collection data
 * @returns {Object} Recommendations by bin
 */
export const recommendCollectionFrequency = (bins, collectionHistory) => {
  const recommendations = {};

  bins.forEach(bin => {
    const binHistory = collectionHistory[bin.id] || [];
    
    if (binHistory.length < 2) {
      recommendations[bin.id] = {
        recommendedFrequency: 'weekly',
        confidence: 'low',
        reason: 'Insufficient historical data'
      };
      return;
    }

    // Calculate average time between collections
    let totalDaysBetweenCollections = 0;
    let collectionsCount = 0;

    for (let i = 1; i < binHistory.length; i++) {
      const daysDiff = (new Date(binHistory[i].timestamp) - new Date(binHistory[i-1].timestamp)) / (1000 * 60 * 60 * 24);
      totalDaysBetweenCollections += daysDiff;
      collectionsCount++;
    }

    const avgDays = totalDaysBetweenCollections / collectionsCount;

    let frequency = 'weekly';
    if (avgDays <= 1) frequency = 'daily';
    else if (avgDays <= 2) frequency = 'alternate-days';
    else if (avgDays <= 4) frequency = 'twice-weekly';
    else if (avgDays <= 14) frequency = 'weekly';
    else frequency = 'bi-weekly';

    recommendations[bin.id] = {
      recommendedFrequency: frequency,
      avgDaysBetweenCollections: avgDays.toFixed(1),
      confidence: binHistory.length >= 10 ? 'high' : binHistory.length >= 5 ? 'medium' : 'low',
      reason: `Based on ${binHistory.length} collections`
    };
  });

  return recommendations;
};

/**
 * Identify peak waste generation periods
 * @param {Array} historicalData - Array of {date, weight} objects
 * @returns {Object} Peak periods analysis
 */
export const identifyPeakPeriods = (historicalData) => {
  if (!historicalData || historicalData.length === 0) {
    return {
      peakDay: null,
      peakMonth: null,
      avgWeekday: {},
      avgMonthly: {}
    };
  }

  const byWeekday = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const byMonth = {};

  historicalData.forEach(record => {
    const date = new Date(record.date);
    const weekday = date.getDay();
    const month = date.getMonth();

    byWeekday[weekday].push(record.weight);
    
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(record.weight);
  });

  // Calculate averages
  const avgWeekday = {};
  Object.keys(byWeekday).forEach(day => {
    if (byWeekday[day].length > 0) {
      avgWeekday[day] = calculateMovingAverage(byWeekday[day], byWeekday[day].length);
    }
  });

  const avgMonthly = {};
  Object.keys(byMonth).forEach(month => {
    if (byMonth[month].length > 0) {
      avgMonthly[month] = calculateMovingAverage(byMonth[month], byMonth[month].length);
    }
  });

  // Find peaks
  const peakDay = Object.entries(avgWeekday).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0]);
  const peakMonth = Object.entries(avgMonthly).reduce((a, b) => a[1] > b[1] ? a : b, [null, 0]);

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    peakDay: peakDay[0] ? weekdays[peakDay[0]] : null,
    peakMonth: peakMonth[0] ? months[peakMonth[0]] : null,
    avgWeekday,
    avgMonthly
  };
};

/**
 * Calculate diversion rate (recycling/composting vs landfill)
 * @param {Array} bins - Array of bin objects
 * @returns {Object} Diversion metrics
 */
export const calculateDiversionRate = (bins) => {
  let totalWeight = 0;
  let divertedWeight = 0; // Recyclable + Biodegradable
  let landfillWeight = 0; // General + Hazardous + Medical + E-waste

  const diversionTypes = ['recyclable', 'biodegradable'];

  bins.forEach(bin => {
    const weight = bin.weight || 0;
    totalWeight += weight;

    if (diversionTypes.includes(bin.wasteType)) {
      divertedWeight += weight;
    } else {
      landfillWeight += weight;
    }
  });

  return {
    totalWeight,
    divertedWeight,
    landfillWeight,
    diversionRate: totalWeight > 0 ? (divertedWeight / totalWeight) * 100 : 0
  };
};
