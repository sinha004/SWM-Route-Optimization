// Multi-vehicle route assignment and optimization

import { getVehicleTypeById } from '../constants/vehicleTypes';
import { isWasteTypeCompatibleWithVehicle } from '../constants/wasteTypes';
import { clusterBinsByLocation, calculateHaversineDistance, calculateBinPriority } from './calculations';

/**
 * Assign bins to vehicles based on waste type compatibility, capacity, and location
 * @param {Array} bins - Array of bin objects that need collection
 * @param {Array} vehicles - Array of available vehicle objects
 * @param {Object} garageLocation - Starting point {lat, lng}
 * @returns {Array} Array of assignments [{vehicleId, bins: [...]}]
 */
export const assignBinsToVehicles = (bins, vehicles, garageLocation) => {
  if (!bins || bins.length === 0 || !vehicles || vehicles.length === 0) {
    return [];
  }

  // Filter only available vehicles
  const availableVehicles = vehicles.filter(v => v.status === 'available');
  
  if (availableVehicles.length === 0) {
    return [];
  }

  // Group bins by waste type first
  const binsByWasteType = bins.reduce((acc, bin) => {
    const type = bin.wasteType || 'general';
    if (!acc[type]) acc[type] = [];
    acc[type].push(bin);
    return acc;
  }, {});

  const assignments = [];

  // For each waste type, find compatible vehicles and assign bins
  Object.entries(binsByWasteType).forEach(([wasteType, typeBins]) => {
    // Find vehicles compatible with this waste type
    const compatibleVehicles = availableVehicles.filter(vehicle => {
      return isWasteTypeCompatibleWithVehicle(wasteType, vehicle.vehicleType);
    });

    if (compatibleVehicles.length === 0) {
      console.warn(`No compatible vehicles for waste type: ${wasteType}`);
      return;
    }

    // Sort bins by priority (high priority first)
    const sortedBins = [...typeBins].sort((a, b) => {
      return calculateBinPriority(b) - calculateBinPriority(a);
    });

    // Cluster bins by location for efficient routing
    const clusters = clusterBinsByLocation(sortedBins, 0.01);

    // Assign clusters to vehicles using a greedy approach
    let vehicleIndex = 0;
    clusters.forEach(cluster => {
      const vehicle = compatibleVehicles[vehicleIndex % compatibleVehicles.length];
      const vehicleType = getVehicleTypeById(vehicle.vehicleType);
      
      // Find existing assignment for this vehicle
      let assignment = assignments.find(a => a.vehicleId === vehicle.id);
      if (!assignment) {
        assignment = {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          vehicleType: vehicle.vehicleType,
          bins: [],
          totalWeight: 0,
          wasteTypes: new Set()
        };
        assignments.push(assignment);
      }

      // Add bins to vehicle if within capacity
      cluster.forEach(bin => {
        const binWeight = bin.weight || 0;
        if (assignment.totalWeight + binWeight <= vehicleType.capacity) {
          assignment.bins.push(bin);
          assignment.totalWeight += binWeight;
          assignment.wasteTypes.add(bin.wasteType);
        } else {
          // Try next vehicle if this one is full
          vehicleIndex++;
          const nextVehicle = compatibleVehicles[vehicleIndex % compatibleVehicles.length];
          let nextAssignment = assignments.find(a => a.vehicleId === nextVehicle.id);
          if (!nextAssignment) {
            nextAssignment = {
              vehicleId: nextVehicle.id,
              vehicleName: nextVehicle.name,
              vehicleType: nextVehicle.vehicleType,
              bins: [],
              totalWeight: 0,
              wasteTypes: new Set()
            };
            assignments.push(nextAssignment);
          }
          nextAssignment.bins.push(bin);
          nextAssignment.totalWeight += binWeight;
          nextAssignment.wasteTypes.add(bin.wasteType);
        }
      });
    });
  });

  // Convert wasteTypes Set to Array for easier handling
  assignments.forEach(assignment => {
    assignment.wasteTypes = Array.from(assignment.wasteTypes);
  });

  return assignments;
};

/**
 * Load balance bins across vehicles more evenly
 * @param {Array} bins - Array of bins to assign
 * @param {Array} vehicles - Array of available vehicles
 * @param {Object} garageLocation - Starting location
 * @returns {Array} Balanced assignments
 */
export const balancedBinAssignment = (bins, vehicles, garageLocation) => {
  if (!bins || bins.length === 0 || !vehicles || vehicles.length === 0) {
    return [];
  }

  const availableVehicles = vehicles.filter(v => v.status === 'available');
  
  if (availableVehicles.length === 0) {
    return [];
  }

  // Sort bins by distance from garage (nearest first)
  const sortedBins = [...bins].sort((a, b) => {
    const distA = calculateHaversineDistance(garageLocation, a);
    const distB = calculateHaversineDistance(garageLocation, b);
    return distA - distB;
  });

  // Initialize assignments for each vehicle
  const assignments = availableVehicles.map(vehicle => ({
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleType: vehicle.vehicleType,
    bins: [],
    totalWeight: 0,
    wasteTypes: []
  }));

  // Round-robin assignment with capacity constraints
  let vehicleIndex = 0;
  sortedBins.forEach(bin => {
    let assigned = false;
    let attempts = 0;
    
    while (!assigned && attempts < availableVehicles.length) {
      const vehicle = availableVehicles[vehicleIndex];
      const vehicleType = getVehicleTypeById(vehicle.vehicleType);
      const assignment = assignments[vehicleIndex];
      
      const binWeight = bin.weight || 0;
      const wasteType = bin.wasteType || 'general';
      
      // Check compatibility and capacity
      if (isWasteTypeCompatibleWithVehicle(wasteType, vehicle.vehicleType) &&
          assignment.totalWeight + binWeight <= vehicleType.capacity) {
        assignment.bins.push(bin);
        assignment.totalWeight += binWeight;
        if (!assignment.wasteTypes.includes(wasteType)) {
          assignment.wasteTypes.push(wasteType);
        }
        assigned = true;
      }
      
      vehicleIndex = (vehicleIndex + 1) % availableVehicles.length;
      attempts++;
    }
    
    if (!assigned) {
      console.warn(`Could not assign bin ${bin.id} to any vehicle`);
    }
  });

  // Filter out vehicles with no bins assigned
  return assignments.filter(a => a.bins.length > 0);
};

/**
 * Calculate total distance for all vehicle routes
 * @param {Array} assignments - Vehicle assignments with routes
 * @returns {number} Total distance in km
 */
export const calculateTotalFleetDistance = (assignments) => {
  return assignments.reduce((total, assignment) => {
    return total + (assignment.totalDistance || 0);
  }, 0);
};

/**
 * Calculate total cost for fleet operation
 * @param {Array} assignments - Vehicle assignments with routes and distances
 * @param {Object} settings - Settings with fuel prices and labor costs
 * @returns {Object} Cost breakdown
 */
export const calculateFleetCost = (assignments, settings) => {
  let totalFuelCost = 0;
  let totalMaintenanceCost = 0;
  let totalLaborCost = 0;
  
  assignments.forEach(assignment => {
    const vehicleType = getVehicleTypeById(assignment.vehicleType);
    const distance = assignment.totalDistance || 0;
    
    // Fuel cost
    if (vehicleType.fuelType === 'electric') {
      totalFuelCost += distance * (settings?.fuelPrice?.electric || 8);
    } else {
      const fuelConsumed = distance / vehicleType.fuelEfficiency;
      const fuelPrice = settings?.fuelPrice?.[vehicleType.fuelType] || 100;
      totalFuelCost += fuelConsumed * fuelPrice;
    }
    
    // Maintenance cost
    totalMaintenanceCost += distance * vehicleType.costPerKm;
    
    // Labor cost (assume 2 hours per route minimum)
    const estimatedHours = Math.max(2, distance / vehicleType.averageSpeed);
    const driverWage = settings?.laborCost?.driverWagePerHour || 150;
    const helperWage = settings?.laborCost?.helperWagePerHour || 100;
    totalLaborCost += estimatedHours * (driverWage + helperWage);
  });
  
  return {
    fuel: totalFuelCost,
    maintenance: totalMaintenanceCost,
    labor: totalLaborCost,
    total: totalFuelCost + totalMaintenanceCost + totalLaborCost
  };
};
