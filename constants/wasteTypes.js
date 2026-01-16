// Waste Type Definitions and Constants

export const WASTE_TYPES = {
  BIODEGRADABLE: {
    id: 'biodegradable',
    name: 'Biodegradable',
    color: '#10b981', // green
    icon: '🍃',
    description: 'Organic waste, food scraps, garden waste',
    disposalSite: 'composting',
    collectionFrequency: 'daily', // higher priority due to decomposition
    priority: 1
  },
  RECYCLABLE: {
    id: 'recyclable',
    name: 'Recyclable',
    color: '#3b82f6', // blue
    icon: '♻️',
    description: 'Paper, plastic, glass, metal',
    disposalSite: 'recycling',
    collectionFrequency: 'alternate-days',
    priority: 2
  },
  HAZARDOUS: {
    id: 'hazardous',
    name: 'Hazardous',
    color: '#ef4444', // red
    icon: '☢️',
    description: 'Chemicals, batteries, electronics with toxic components',
    disposalSite: 'hazardous-facility',
    collectionFrequency: 'weekly',
    priority: 5, // highest priority for safety
    requiresSpecialHandling: true
  },
  E_WASTE: {
    id: 'e-waste',
    name: 'E-Waste',
    color: '#8b5cf6', // purple
    icon: '💻',
    description: 'Electronic waste, computers, phones, appliances',
    disposalSite: 'e-waste-facility',
    collectionFrequency: 'weekly',
    priority: 4,
    requiresSpecialHandling: true
  },
  MEDICAL: {
    id: 'medical',
    name: 'Medical Waste',
    color: '#f59e0b', // amber
    icon: '🏥',
    description: 'Hospital waste, syringes, contaminated materials',
    disposalSite: 'medical-incinerator',
    collectionFrequency: 'daily',
    priority: 5, // highest priority for safety
    requiresSpecialHandling: true
  },
  GENERAL: {
    id: 'general',
    name: 'General Waste',
    color: '#6b7280', // gray
    icon: '🗑️',
    description: 'Non-recyclable, non-hazardous mixed waste',
    disposalSite: 'landfill',
    collectionFrequency: 'daily',
    priority: 3
  }
};

// Helper functions
export const getWasteTypeById = (id) => {
  return Object.values(WASTE_TYPES).find(type => type.id === id) || WASTE_TYPES.GENERAL;
};

export const getWasteTypeColor = (id) => {
  return getWasteTypeById(id).color;
};

export const getWasteTypeIcon = (id) => {
  return getWasteTypeById(id).icon;
};

export const getAllWasteTypes = () => {
  return Object.values(WASTE_TYPES);
};

export const getWasteTypesByPriority = () => {
  return Object.values(WASTE_TYPES).sort((a, b) => b.priority - a.priority);
};

// Waste type compatibility with vehicles (some waste types need specific vehicles)
export const WASTE_TYPE_VEHICLE_COMPATIBILITY = {
  biodegradable: ['standard', 'compactor'],
  recyclable: ['standard', 'compactor', 'open-truck'],
  hazardous: ['hazmat-truck'],
  'e-waste': ['standard', 'open-truck'],
  medical: ['medical-waste-truck'],
  general: ['standard', 'compactor']
};

export const isWasteTypeCompatibleWithVehicle = (wasteTypeId, vehicleType) => {
  const compatible = WASTE_TYPE_VEHICLE_COMPATIBILITY[wasteTypeId];
  return compatible ? compatible.includes(vehicleType) : false;
};
