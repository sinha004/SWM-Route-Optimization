// Vehicle Type Definitions and Constants

// Current fuel prices in Jharkhand (as of May 2026)
// Source: Indian Oil Corporation / Petroleum Ministry daily price revision
export const JHARKHAND_FUEL_PRICES = {
  petrol: 98.62,   // ₹ per litre (Ranchi, Jharkhand)
  diesel: 93.36,   // ₹ per litre (Ranchi, Jharkhand)
  electric: 8.0,   // ₹ per kWh (average commercial rate)
  lastUpdated: '2026-05-01'
};

// CO₂ Emission Factors (IPCC 2006 Guidelines / India GHG Program)
// These are direct (tank-to-wheel) combustion emission factors
export const CO2_EMISSION_FACTORS = {
  diesel: 2.68,    // kg CO₂ per litre of diesel
  petrol: 2.31,    // kg CO₂ per litre of petrol
  electric: 0.0,   // kg CO₂ per kWh (zero direct/tailpipe emissions)
  source: 'IPCC 2006 Guidelines / India GHG Program'
};

export const VEHICLE_TYPES = {
  STANDARD: {
    id: 'standard',
    name: 'Standard Truck',
    icon: '🚚',
    capacity: 5000, // kg
    fuelEfficiency: 6, // km per liter
    emissionFactor: 2.68, // kg CO2 per liter of diesel
    fuelType: 'diesel',
    costPerKm: 15, // INR maintenance cost per km
    maxBinsPerTrip: 30,
    averageSpeed: 30, // km/h in city traffic
    description: 'Standard waste collection truck for general waste'
  },
  COMPACTOR: {
    id: 'compactor',
    name: 'Compactor Truck',
    icon: '🚛',
    capacity: 10000, // kg
    fuelEfficiency: 4.5, // km per liter
    emissionFactor: 2.68, // kg CO2 per liter of diesel
    fuelType: 'diesel',
    costPerKm: 25, // INR maintenance cost per km
    maxBinsPerTrip: 50,
    averageSpeed: 25, // km/h (slower due to size)
    description: 'Large compactor truck for high-volume routes'
  },
  MINI_TRUCK: {
    id: 'mini-truck',
    name: 'Mini Truck',
    icon: '🛻',
    capacity: 2000, // kg
    fuelEfficiency: 12, // km per liter
    emissionFactor: 2.31, // kg CO2 per liter of petrol
    fuelType: 'petrol',
    costPerKm: 8, // INR maintenance cost per km
    maxBinsPerTrip: 15,
    averageSpeed: 35, // km/h (faster, more agile)
    description: 'Small truck for narrow streets and low-density areas'
  },
  OPEN_TRUCK: {
    id: 'open-truck',
    name: 'Open Truck',
    icon: '🚐',
    capacity: 3000, // kg
    fuelEfficiency: 8, // km per liter
    emissionFactor: 2.31, // kg CO2 per liter of petrol
    fuelType: 'petrol',
    costPerKm: 10, // INR maintenance cost per km
    maxBinsPerTrip: 20,
    averageSpeed: 32, // km/h
    description: 'Open truck for recyclables and bulky waste'
  },
  HAZMAT_TRUCK: {
    id: 'hazmat-truck',
    name: 'Hazmat Vehicle',
    icon: '☢️',
    capacity: 1500, // kg (specialized, lower capacity)
    fuelEfficiency: 7, // km per liter
    emissionFactor: 2.68, // kg CO2 per liter of diesel
    fuelType: 'diesel',
    costPerKm: 30, // INR (higher due to specialized equipment)
    maxBinsPerTrip: 10,
    averageSpeed: 28, // km/h (careful driving required)
    description: 'Specialized vehicle for hazardous waste collection',
    requiresSpecialLicense: true
  },
  MEDICAL_WASTE_TRUCK: {
    id: 'medical-waste-truck',
    name: 'Medical Waste Truck',
    icon: '🏥',
    capacity: 1000, // kg
    fuelEfficiency: 7, // km per liter
    emissionFactor: 2.68, // kg CO2 per liter of diesel
    fuelType: 'diesel',
    costPerKm: 35, // INR (highest due to sterilization requirements)
    maxBinsPerTrip: 8,
    averageSpeed: 30, // km/h
    description: 'Specialized vehicle for medical waste with containment',
    requiresSpecialLicense: true
  },
  ELECTRIC_TRUCK: {
    id: 'electric-truck',
    name: 'Electric Truck',
    icon: '⚡',
    capacity: 4000, // kg
    fuelEfficiency: 100, // km per charge (equivalent)
    emissionFactor: 0, // zero direct emissions
    fuelType: 'electric',
    costPerKm: 5, // INR (lower maintenance)
    maxBinsPerTrip: 25,
    averageSpeed: 30, // km/h
    range: 150, // km per charge
    chargingTime: 4, // hours
    description: 'Zero-emission electric waste collection truck'
  }
};

// Helper functions
export const getVehicleTypeById = (id) => {
  return Object.values(VEHICLE_TYPES).find(type => type.id === id) || VEHICLE_TYPES.STANDARD;
};

export const getAllVehicleTypes = () => {
  return Object.values(VEHICLE_TYPES);
};

export const getVehicleIcon = (id) => {
  return getVehicleTypeById(id).icon;
};

/**
 * Calculate fuel cost for a trip based on current Jharkhand fuel prices
 * @param {number} distance - Distance in km
 * @param {string} vehicleTypeId - Vehicle type identifier
 * @param {string|null} fuelTypeOverride - Optional fuel type override ('petrol', 'diesel', 'electric')
 * @returns {Object} { totalCost, fuelConsumed, fuelPrice, fuelType, unit }
 */
export const calculateFuelCost = (distance, vehicleTypeId, fuelTypeOverride = null) => {
  const vehicle = getVehicleTypeById(vehicleTypeId);
  const activeFuelType = fuelTypeOverride || vehicle.fuelType;
  
  if (activeFuelType === 'electric') {
    const pricePerKwh = JHARKHAND_FUEL_PRICES.electric;
    const energyConsumed = distance * 1.0;
    return {
      totalCost: energyConsumed * pricePerKwh,
      fuelConsumed: energyConsumed,
      fuelPrice: pricePerKwh,
      fuelType: 'electric',
      unit: 'kWh'
    };
  }
  
  const fuelPrice = JHARKHAND_FUEL_PRICES[activeFuelType] || JHARKHAND_FUEL_PRICES.diesel;
  const fuelConsumed = distance / vehicle.fuelEfficiency;
  
  return {
    totalCost: fuelConsumed * fuelPrice,
    fuelConsumed: fuelConsumed,
    fuelPrice: fuelPrice,
    fuelType: activeFuelType,
    unit: 'litres'
  };
};

export const calculateMaintenanceCost = (distance, vehicleTypeId) => {
  const vehicle = getVehicleTypeById(vehicleTypeId);
  return distance * vehicle.costPerKm;
};

/**
 * Calculate CO₂ emissions for a trip using IPCC emission factors
 * Formula: CO₂ (kg) = Fuel Consumed (litres) × Emission Factor (kg CO₂/litre)
 * @param {number} distance - Distance in km
 * @param {string} vehicleTypeId - Vehicle type identifier
 * @param {string|null} fuelTypeOverride - Optional fuel type override ('petrol', 'diesel', 'electric')
 * @returns {Object} { totalEmissions, fuelConsumed, emissionFactor, fuelType, equivalents }
 */
export const calculateCO2Emissions = (distance, vehicleTypeId, fuelTypeOverride = null) => {
  const vehicle = getVehicleTypeById(vehicleTypeId);
  const activeFuelType = fuelTypeOverride || vehicle.fuelType;
  
  if (activeFuelType === 'electric') {
    return {
      totalEmissions: 0,
      fuelConsumed: 0,
      emissionFactor: 0,
      fuelType: 'electric',
      equivalents: { treeDaysAbsorption: 0, carKmEquivalent: 0 }
    };
  }
  
  const emissionFactor = CO2_EMISSION_FACTORS[activeFuelType] || CO2_EMISSION_FACTORS.diesel;
  const fuelConsumed = distance / vehicle.fuelEfficiency;
  const totalEmissions = fuelConsumed * emissionFactor;
  
  return {
    totalEmissions: totalEmissions,
    fuelConsumed: fuelConsumed,
    emissionFactor: emissionFactor,
    fuelType: activeFuelType,
    equivalents: {
      treeDaysAbsorption: totalEmissions / 0.06,
      carKmEquivalent: totalEmissions / 0.21
    }
  };
};

export const calculateTripDuration = (distance, vehicleTypeId) => {
  const vehicle = getVehicleTypeById(vehicleTypeId);
  return (distance / vehicle.averageSpeed) * 60; // returns minutes
};

// Vehicle status constants
export const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  IN_USE: 'in-use',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out-of-service'
};
