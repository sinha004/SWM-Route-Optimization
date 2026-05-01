// LocalStorage management for data persistence

const STORAGE_KEYS = {
  DUSTBINS: 'swm_dustbins',
  VEHICLES: 'swm_vehicles',
  TRIPS: 'swm_trips',
  COLLECTION_HISTORY: 'swm_collection_history',
  COST_HISTORY: 'swm_cost_history',
  GARAGE_LOCATION: 'swm_garage_location',
  DISPOSAL_SITES: 'swm_disposal_sites',
  SETTINGS: 'swm_settings'
};

/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {any} data - Data to save
 */
export const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} Loaded data or default value
 */
export const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
};

/**
 * Clear all app data from localStorage
 */
export const clearAllStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

// Dustbin operations
export const saveDustbins = (dustbins) => {
  return saveToStorage(STORAGE_KEYS.DUSTBINS, dustbins);
};

export const loadDustbins = () => {
  return loadFromStorage(STORAGE_KEYS.DUSTBINS, []);
};

// Vehicle operations
export const saveVehicles = (vehicles) => {
  return saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
};

export const loadVehicles = () => {
  return loadFromStorage(STORAGE_KEYS.VEHICLES, []);
};

// Trip operations
export const saveTrip = (trip) => {
  const trips = loadFromStorage(STORAGE_KEYS.TRIPS, []);
  trips.push({
    ...trip,
    id: Date.now(),
    timestamp: new Date().toISOString()
  });
  return saveToStorage(STORAGE_KEYS.TRIPS, trips);
};

export const loadTrips = (limit = 100) => {
  const trips = loadFromStorage(STORAGE_KEYS.TRIPS, []);
  return trips.slice(-limit); // Return last N trips
};

export const getTripsInDateRange = (startDate, endDate) => {
  const trips = loadFromStorage(STORAGE_KEYS.TRIPS, []);
  return trips.filter(trip => {
    const tripDate = new Date(trip.timestamp);
    return tripDate >= startDate && tripDate <= endDate;
  });
};

// Collection history operations
export const saveCollectionRecord = (dustbinId, record) => {
  const history = loadFromStorage(STORAGE_KEYS.COLLECTION_HISTORY, {});
  if (!history[dustbinId]) {
    history[dustbinId] = [];
  }
  history[dustbinId].push({
    ...record,
    timestamp: new Date().toISOString()
  });
  return saveToStorage(STORAGE_KEYS.COLLECTION_HISTORY, history);
};

export const getCollectionHistory = (dustbinId) => {
  const history = loadFromStorage(STORAGE_KEYS.COLLECTION_HISTORY, {});
  return history[dustbinId] || [];
};

export const getAllCollectionHistory = () => {
  return loadFromStorage(STORAGE_KEYS.COLLECTION_HISTORY, {});
};

// Cost history operations
export const saveCostRecord = (record) => {
  const costHistory = loadFromStorage(STORAGE_KEYS.COST_HISTORY, []);
  costHistory.push({
    ...record,
    timestamp: new Date().toISOString()
  });
  return saveToStorage(STORAGE_KEYS.COST_HISTORY, costHistory);
};

export const getCostHistory = (days = 30) => {
  const costHistory = loadFromStorage(STORAGE_KEYS.COST_HISTORY, []);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return costHistory.filter(record => {
    return new Date(record.timestamp) >= cutoffDate;
  });
};

// Location operations
export const saveGarageLocation = (location) => {
  return saveToStorage(STORAGE_KEYS.GARAGE_LOCATION, location);
};

export const loadGarageLocation = () => {
  return loadFromStorage(STORAGE_KEYS.GARAGE_LOCATION, null);
};

export const saveDisposalSites = (sites) => {
  return saveToStorage(STORAGE_KEYS.DISPOSAL_SITES, sites);
};

export const loadDisposalSites = () => {
  return loadFromStorage(STORAGE_KEYS.DISPOSAL_SITES, []);
};

// Settings operations
export const saveSettings = (settings) => {
  const currentSettings = loadSettings();
  const updatedSettings = { ...currentSettings, ...settings };
  return saveToStorage(STORAGE_KEYS.SETTINGS, updatedSettings);
};

export const loadSettings = () => {
  return loadFromStorage(STORAGE_KEYS.SETTINGS, {
    fuelPrice: {
      diesel: 93.36, // INR per liter (Jharkhand, May 2026)
      petrol: 98.62, // INR per liter (Jharkhand, May 2026)
      electric: 8 // INR per kWh
    },
    laborCost: {
      driverWagePerHour: 150, // INR
      helperWagePerHour: 100 // INR
    },
    disposalCost: {
      biodegradable: 500, // INR per ton
      recyclable: 300, // INR per ton
      general: 800, // INR per ton
      hazardous: 2000, // INR per ton
      medical: 3000, // INR per ton
      'e-waste': 1500 // INR per ton
    },
    workingHours: {
      start: '06:00',
      end: '18:00'
    },
    trafficApiKey: '', // For Google Maps or other traffic APIs
    enableTrafficRouting: false
  });
};

// Export all storage keys for reference
export { STORAGE_KEYS };

// Data export/import for backup
export const exportAllData = () => {
  const data = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    data[name] = loadFromStorage(key);
  });
  return JSON.stringify(data, null, 2);
};

export const importAllData = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      if (data[name]) {
        saveToStorage(key, data[name]);
      }
    });
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};
