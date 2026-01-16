// Vehicle Type Definitions and Constants

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

export const calculateFuelCost = (distance, vehicleTypeId, fuelPricePerLiter) => {
  const vehicle = getVehicleTypeById(vehicleTypeId);
  if (vehicle.fuelType === 'electric') {
    // For electric vehicles, use electricity cost (assuming ₹8 per kWh, ~1 kWh per km)
    return distance * 8; // INR
  }
  const fuelConsumed = distance / vehicle.fuelEfficiency;
  return fuelConsumed * fuelPricePerLiter;
};

export const calculateMaintenanceCost = (distance, vehicleTypeId) => {
  const vehicle = getVehicleTypeById(vehicleTypeId);
  return distance * vehicle.costPerKm;
};

export const calculateCO2Emissions = (distance, vehicleTypeId) => {
  const vehicle = getVehicleTypeById(vehicleTypeId);
  if (vehicle.fuelType === 'electric') {
    return 0; // Zero direct emissions
  }
  const fuelConsumed = distance / vehicle.fuelEfficiency;
  return fuelConsumed * vehicle.emissionFactor;
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
