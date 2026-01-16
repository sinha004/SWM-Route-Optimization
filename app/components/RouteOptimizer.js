import { useState } from 'react';
import { 
  optimizeRoute, 
  buildDistanceMatrix, 
  nearestNeighbor, 
  calculateRouteDistance 
} from '../../utils/routeAlgorithms';

const RouteOptimizer = ({ dustbins, onRouteCalculated, garageLocation, disposalSite }) => {
  const [optimalRoute, setOptimalRoute] = useState([]);
  const [storedMainRoute, setStoredMainRoute] = useState(null);
  const [storedAltRoute, setStoredAltRoute] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const [alternativeTotalDistance, setAlternativeTotalDistance] = useState(0);
  const [selectedRoute, setSelectedRoute] = useState('optimized');
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [fuelCost, setFuelCost] = useState(0);
  const [mileage, setMileage] = useState(0);
  const [costSavings, setCostSavings] = useState(0);
  const [usedAlgorithm, setUsedAlgorithm] = useState('');
  const [optimizationStats, setOptimizationStats] = useState(null);

  // Track if OSRM API is available (to avoid repeated failed calls)
  const [osrmAvailable, setOsrmAvailable] = useState(true);

  // Fallback route using straight line and Haversine distance
  const getFallbackRoute = (start, end) => {
    const R = 6371; // Earth's radius in km
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLon = (end.lng - start.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const straightLineDistance = R * c;
    
    // Estimate road distance as ~1.3x straight line (typical road factor for urban areas)
    const estimatedRoadDistance = straightLineDistance * 1.3;
    
    return {
      coordinates: [
        { lat: start.lat, lng: start.lng },
        { lat: end.lat, lng: end.lng }
      ],
      distance: estimatedRoadDistance
    };
  };

  const getRoadRoute = async (start, end) => {
    // If OSRM was already found unavailable, use fallback immediately
    if (!osrmAvailable) {
      return getFallbackRoute(start, end);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      // Check if response is OK
      if (!response.ok) {
        console.warn(`OSRM API returned status ${response.status}, using fallback`);
        return getFallbackRoute(start, end);
      }

      // Check content type to avoid parsing HTML as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('OSRM returned non-JSON response, using fallback');
        return getFallbackRoute(start, end);
      }

      const data = await response.json();
      if (data.routes && data.routes[0]) {
        return {
          coordinates: data.routes[0].geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
          })),
          distance: data.routes[0].distance / 1000 // Convert meters to kilometers
        };
      }
      return getFallbackRoute(start, end);
    } catch (error) {
      // If fetch fails, mark OSRM as unavailable for this session
      console.warn('OSRM API unavailable, switching to fallback mode:', error.message);
      setOsrmAvailable(false);
      return getFallbackRoute(start, end);
    }
  };

  const calculateRoadDistance = async (point1, point2) => {
    try {
      const routeData = await getRoadRoute(point1, point2);
      return routeData.distance || getFallbackRoute(point1, point2).distance;
    } catch (error) {
      console.error('Error calculating road distance, using fallback:', error);
      // Return Haversine fallback distance instead of Infinity
      return getFallbackRoute(point1, point2).distance;
    }
  };

  const calculateOptimalRoute = async () => {
    setIsCalculating(true);
    try {
      if (!garageLocation || !disposalSite) {
        alert('Please set both garage and disposal site locations before calculating the route');
        return;
      }

      const redDustbins = dustbins.filter(dustbin => dustbin.status === 'red');
      
      if (redDustbins.length === 0) {
        alert('There are no red dustbins to collect at the moment.');
        setOptimalRoute([]);
        setStoredMainRoute(null);
        setStoredAltRoute(null);
        setOptimizationStats(null);
        onRouteCalculated([], [], garageLocation, disposalSite);
        return;
      }

      // Build array of all points: [garage, ...dustbins, disposal]
      const allPoints = [garageLocation, ...redDustbins, disposalSite];
      const n = allPoints.length;
      const startIdx = 0;
      const endIdx = n - 1;

      // Step 1: Build distance matrix using OSRM (real road distances)
      console.log('Building distance matrix using OSRM...');
      const distanceMatrix = await buildDistanceMatrix(allPoints, calculateRoadDistance);
      
      // Step 2: Calculate Nearest Neighbor baseline for comparison
      const nnResult = nearestNeighbor(distanceMatrix, startIdx, endIdx);
      const nnDistance = nnResult.distance;

      // Step 3: Apply advanced optimization (Held-Karp, 2-opt, Simulated Annealing)
      console.log('Applying advanced route optimization algorithms...');
      const optimizedResult = optimizeRoute(distanceMatrix, startIdx, endIdx, allPoints);
      
      // Verify optimized result has valid route
      if (!optimizedResult || !optimizedResult.route || !Array.isArray(optimizedResult.route)) {
        console.error('Invalid optimization result:', optimizedResult);
        throw new Error('Route optimization failed to produce a valid route');
      }
      
      console.log('Optimized route indices:', optimizedResult.route);
      
      // Calculate improvement percentage
      const improvement = ((nnDistance - optimizedResult.distance) / nnDistance * 100).toFixed(1);
      
      setUsedAlgorithm(optimizedResult.algorithm);
      setOptimizationStats({
        nnDistance: nnDistance,
        optimizedDistance: optimizedResult.distance,
        improvement: improvement,
        nodesCount: n
      });

      // Step 4: Convert optimized route indices back to waypoints for Leaflet Routing Machine
      const optimizedPoints = optimizedResult.route.map(idx => allPoints[idx]);
      
      // Calculate total distance using the distance matrix (already computed via OSRM/fallback)
      let totalDistanceKm = 0;
      for (let i = 0; i < optimizedResult.route.length - 1; i++) {
        totalDistanceKm += distanceMatrix[optimizedResult.route[i]][optimizedResult.route[i + 1]];
      }

      const mainRoute = { 
        waypoints: optimizedPoints, // Send waypoints instead of detailed coordinates
        totalDistance: totalDistanceKm,
        pointOrder: optimizedResult.route.slice(1, -1).map(idx => allPoints[idx]) // Dustbins in order
      };

      // Step 5: Build Nearest Neighbor route for comparison (alternative route)
      const nnPoints = nnResult.route.map(idx => allPoints[idx]);
      let nnTotalDistance = 0;
      for (let i = 0; i < nnResult.route.length - 1; i++) {
        nnTotalDistance += distanceMatrix[nnResult.route[i]][nnResult.route[i + 1]];
      }

      const altRoute = {
        waypoints: nnPoints, // Send waypoints for Leaflet Routing Machine
        totalDistance: nnTotalDistance,
        pointOrder: nnResult.route.slice(1, -1).map(idx => allPoints[idx])
      };

      // Store both routes in state
      setStoredMainRoute(mainRoute);
      setStoredAltRoute(altRoute);
      setTotalDistance(mainRoute.totalDistance);
      setAlternativeTotalDistance(altRoute.totalDistance);
      setOptimalRoute(mainRoute.pointOrder);
      
      // Send waypoints to map for Leaflet Routing Machine to render road routes
      onRouteCalculated(
        selectedRoute === 'optimized' ? mainRoute.waypoints : [],
        selectedRoute === 'nearest-neighbor' ? altRoute.waypoints : [],
        garageLocation,
        disposalSite
      );

    } catch (error) {
      console.error('Error calculating routes:', error);
      alert('An error occurred while calculating the routes. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const redDustbinsCount = dustbins.filter(d => d.status === 'red').length;

  const handleRouteSelection = (routeType) => {
    setSelectedRoute(routeType);
    // Use stored waypoints for Leaflet Routing Machine
    const displayWaypoints = routeType === 'optimized' ? storedMainRoute?.waypoints : storedAltRoute?.waypoints;
    const emptyRoute = [];
    onRouteCalculated(
      routeType === 'optimized' ? displayWaypoints || [] : emptyRoute,
      routeType === 'nearest-neighbor' ? displayWaypoints || [] : emptyRoute,
      garageLocation,
      disposalSite
    );
  };

  // Route selection UI with algorithm information
  const RouteSelector = ({ totalDistance, alternativeTotalDistance }) => (
    <div className="space-y-4">
      {/* Optimized Route */}
      <div 
        onClick={() => handleRouteSelection('optimized')}
        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
          selectedRoute === 'optimized' 
            ? 'bg-green-500 text-white shadow-lg transform scale-[1.02]' 
            : 'bg-green-50 text-gray-700 hover:bg-green-100'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <h3 className="font-medium">Optimized Route</h3>
          </div>
          {selectedRoute === 'optimized' && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded">Active</span>
          )}
        </div>
        <p className="text-sm opacity-90">Distance: {totalDistance.toFixed(2)} km</p>
        {usedAlgorithm && (
          <p className="text-xs opacity-75 mt-1">Algorithm: {usedAlgorithm}</p>
        )}
        {optimizationStats && optimizationStats.improvement > 0 && (
          <p className="text-xs mt-1 font-medium">
            ✨ {optimizationStats.improvement}% better than baseline
          </p>
        )}
      </div>

      {/* Nearest Neighbor Route (for comparison) */}
      <div 
        onClick={() => handleRouteSelection('nearest-neighbor')}
        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
          selectedRoute === 'nearest-neighbor' 
            ? 'bg-orange-500 text-white shadow-lg transform scale-[1.02]' 
            : 'bg-orange-50 text-gray-700 hover:bg-orange-100'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <h3 className="font-medium">Nearest Neighbor (Baseline)</h3>
          </div>
          {selectedRoute === 'nearest-neighbor' && (
            <span className="text-sm bg-white/20 px-2 py-1 rounded">Active</span>
          )}
        </div>
        <p className="text-sm opacity-90">Distance: {alternativeTotalDistance.toFixed(2)} km</p>
        <p className="text-xs opacity-75 mt-1">Simple greedy algorithm for comparison</p>
      </div>
    </div>
  );

  // Add this new component for the fuel cost modal
  const FuelCostModal = ({ onClose, onSave, fuelCost, mileage }) => {
    const [tempFuelCost, setTempFuelCost] = useState(fuelCost);
    const [tempMileage, setTempMileage] = useState(mileage);

    const handleSave = () => {
      if (tempFuelCost > 0 && tempMileage > 0) {
        onSave(tempFuelCost, tempMileage);
        onClose();
      } else {
        alert('Please enter valid values for fuel cost and mileage');
      }
    };

    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1000] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⛽</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Fuel Cost Calculator</h3>
            <p className="text-gray-700 mt-2">Enter fuel cost and vehicle mileage</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Fuel Cost (₹/litre)
              </label>
              <input
                type="number"
                value={tempFuelCost}
                onChange={(e) => setTempFuelCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="Enter fuel cost"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Vehicle Mileage (km/litre)
              </label>
              <input
                type="number"
                value={tempMileage}
                onChange={(e) => setTempMileage(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                placeholder="Enter vehicle mileage"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Route Optimization</h2>
        </div>
        <p className="text-blue-100 text-sm">Optimize your waste collection route for maximum efficiency</p>
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-6">
        {/* Location Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LocationCard
            title="Starting Point"
            location={garageLocation}
            icon="🏢"
            instruction="Click on map to set garage location"
          />
          <LocationCard
            title="Disposal Site"
            location={disposalSite}
            icon="📍"
            instruction="Click on map to set disposal site"
          />
        </div>

        {/* Status Section */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-gray-900 font-medium">Red Dustbins to Collect</span>
            <span className={`text-lg font-bold ${redDustbinsCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {redDustbinsCount}
            </span>
          </div>
        </div>

        {/* Route Display */}
        {optimalRoute.length > 0 ? (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3">Optimized Route</h3>
            <div className="space-y-2">
              <RouteStep number="S" label="Start at Garage" icon="🏢" />
              {optimalRoute.map((stop, index) => (
                <RouteStep
                  key={index}
                  number={index + 1}
                  label={`Collect Dustbin #${stop.id}`}
                  icon="🗑️"
                />
              ))}
              <RouteStep number="E" label="End at Disposal Site" icon="📍" />
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-700">
            {redDustbinsCount === 0 ? (
              <p>No red dustbins to collect</p>
            ) : (
              <p>Route will be displayed here after calculation</p>
            )}
          </div>
        )}

        <RoutePointsCard 
          route={optimalRoute} 
          dustbins={dustbins} 
          totalDistance={totalDistance}
        />

        {totalDistance > 0 && (
          <>
            <div className="text-center text-sm text-gray-800 mb-2">
              Click on a route option below to view it on the map
            </div>
            <RouteSelector 
              totalDistance={totalDistance} 
              alternativeTotalDistance={alternativeTotalDistance}
            />
          </>
        )}

        {/* Algorithm Details Card */}
        {optimizationStats && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🧠</span>
              <h3 className="font-medium text-gray-900">Algorithm Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Algorithm Used:</span>
                <span className="font-medium text-purple-700">{usedAlgorithm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Nodes Optimized:</span>
                <span className="font-medium text-gray-900">{optimizationStats.nodesCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Baseline (Nearest Neighbor):</span>
                <span className="font-medium text-orange-600">{optimizationStats.nnDistance.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Optimized Distance:</span>
                <span className="font-medium text-green-600">{optimizationStats.optimizedDistance.toFixed(2)} km</span>
              </div>
              {optimizationStats.improvement > 0 && (
                <div className="mt-2 p-2 bg-green-100 rounded-lg text-center">
                  <span className="text-green-800 font-bold">
                    ✨ {optimizationStats.improvement}% Route Improvement
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {totalDistance > 0 && (
          <>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⛽</span>
                  <h3 className="font-medium">Fuel Cost Analysis</h3>
                </div>
                <button
                  onClick={() => setShowFuelModal(true)}
                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  Set Fuel Cost
                </button>
              </div>
              
              {fuelCost > 0 && mileage > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-800">Fuel Cost:</span>
                    <span className="font-medium text-gray-900">₹{fuelCost}/litre</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-800">Vehicle Mileage:</span>
                    <span className="font-medium text-gray-900">{mileage} km/litre</span>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Potential Savings:</span>
                      <span className="text-lg font-bold text-green-700">₹{costSavings.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 text-center">
                  Enter fuel cost and mileage to calculate potential savings
                </p>
              )}
            </div>
          </>
        )}

        {showFuelModal && (
          <FuelCostModal
            onClose={() => setShowFuelModal(false)}
            onSave={(newFuelCost, newMileage) => {
              setFuelCost(newFuelCost);
              setMileage(newMileage);
              // Calculate savings
              if (alternativeTotalDistance > totalDistance) {
                const distanceDiff = alternativeTotalDistance - totalDistance;
                const fuelUsed = distanceDiff / newMileage;
                const savings = fuelUsed * newFuelCost;
                setCostSavings(savings);
              }
            }}
            fuelCost={fuelCost}
            mileage={mileage}
          />
        )}

        {/* Calculate Button */}
        <button
          onClick={calculateOptimalRoute}
          disabled={!garageLocation || !disposalSite || isCalculating}
          className={`w-full py-3 px-4 rounded-xl font-medium text-white shadow-lg
            ${!garageLocation || !disposalSite
              ? 'bg-gray-400 cursor-not-allowed'
              : isCalculating
                ? 'bg-blue-400 cursor-wait'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-200'
            }`}
        >
          {isCalculating ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Calculating...</span>
            </div>
          ) : (
            'Calculate Route'
          )}
        </button>
        
      </div>
    </div>
  );
};

// Helper Components
const LocationCard = ({ title, location, icon, instruction }) => (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">{icon}</span>
      <h3 className="font-medium text-gray-900">{title}</h3>
    </div>
    {location ? (
      <p className="text-sm text-gray-800">
        ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
      </p>
    ) : (
      <p className="text-sm text-gray-700 italic">{instruction}</p>
    )}
  </div>
);

const RouteStep = ({ number, label, icon }) => (
  <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors">
    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
      {number}
    </div>
    <span className="text-xl">{icon}</span>
    <span className="text-gray-700">{label}</span>
  </div>
);

const RoutePointsCard = ({ route, dustbins, totalDistance }) => {
  const redDustbinsCount = dustbins.filter(d => d.status === 'red').length;
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🛣️</span>
        <h3 className="font-medium text-gray-900">Route Points</h3>
      </div>
      <p className="text-sm text-gray-800 mb-3">Total stops in optimized route</p>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-2 rounded-lg">
          <p className="text-sm text-gray-800">Start</p>
          <p className="font-medium text-blue-700">Garage</p>
        </div>
        <div className="bg-gray-50 p-2 rounded-lg">
          <p className="text-sm text-gray-800">Stops</p>
          <p className="font-medium text-blue-700">{redDustbinsCount}</p>
        </div>
        <div className="bg-gray-50 p-2 rounded-lg">
          <p className="text-sm text-gray-800">End</p>
          <p className="font-medium text-blue-700">Disposal</p>
        </div>
      </div>

      {totalDistance > 0 && (
        <div className="mt-4 bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-sm text-gray-800">Total Distance</p>
          <p className="font-medium text-blue-700">{totalDistance.toFixed(2)} km</p>
        </div>
      )}
    </div>
  );
};

export default RouteOptimizer; 