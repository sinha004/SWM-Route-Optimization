'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import RouteOptimizer from './components/RouteOptimizer';
import FleetManager from './components/FleetManager';
import { saveDustbins, loadDustbins, saveGarageLocation, loadGarageLocation, saveDisposalSites, loadDisposalSites } from '../lib/storage';
import { WASTE_TYPES } from '../constants/wasteTypes';
import { 
  calculateFuelCost, 
  calculateCO2Emissions,
  JHARKHAND_FUEL_PRICES,
  CO2_EMISSION_FACTORS
} from '../constants/vehicleTypes';

const MapWrapper = dynamic(() => import('./components/MapWrapper'), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-gray-200 animate-pulse rounded-lg shadow-lg" />
});


export default function Home() {
  const [dustbins, setDustbins] = useState([]);
  const [route, setRoute] = useState([]);
  const [alternativeRoute, setAlternativeRoute] = useState([]);
  const [garageLocation, setGarageLocation] = useState(null);
  const [disposalSite, setDisposalSite] = useState(null);
  const [disposalSites, setDisposalSites] = useState([]); // Multiple disposal sites for different waste types
  const [isLoading, setIsLoading] = useState(false);
  const [showBinUpdateModal, setShowBinUpdateModal] = useState(false);
  const [selectedBinForUpdate, setSelectedBinForUpdate] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [routeStats, setRouteStats] = useState(null); // Persists until reset

  // Function to clear all localStorage and reset the app
  const handleResetApp = () => {
    // Clear all app-related localStorage keys
    Object.keys(localStorage)
      .filter(key => key.startsWith('swm_'))
      .forEach(key => localStorage.removeItem(key));
    
    // Reset all state
    setDustbins([]);
    setRoute([]);
    setAlternativeRoute([]);
    setGarageLocation(null);
    setDisposalSite(null);
    setDisposalSites([]);
    setVehicles([]);
    setRouteStats(null);
    setShowResetModal(false);
    
    // Optionally reload the page for a complete fresh start
    window.location.reload();
  };

  const toggleDustbinStatus = (id) => {
      setDustbins(prevDustbins => {
      const updatedDustbins = prevDustbins.map(dustbin => 
        dustbin.id === id 
          ? { ...dustbin, status: dustbin.status === 'red' ? 'green' : 'red' }
          : dustbin
      );
      return updatedDustbins;
    });
    setRoute([]);
  };

  const handleDustbinAdd = (newDustbin) => {
    // Enhanced dustbin with additional properties
    const enhancedDustbin = {
      ...newDustbin,
      fillLevel: 0, // 0-100%
      wasteType: 'general', // default waste type
      weight: 0, // kg
      lastUpdated: new Date().toISOString(),
      collectionHistory: [],
      status: 'green' // Will turn red when fillLevel > 80
    };

    setDustbins(prevDustbins => {
      const updatedDustbins = [...prevDustbins, enhancedDustbin];
      saveDustbins(updatedDustbins); // Persist to localStorage
      return updatedDustbins;
    });
    setRoute([]);
  };

  const handleDustbinRemove = (id) => {
    setDustbins(prevDustbins => {
      const updated = prevDustbins.filter(dustbin => dustbin.id !== id);
      saveDustbins(updated); // Persist to localStorage
      return updated;
    });
    setRoute([]);
  };

  const handleDustbinUpdate = (id, updates) => {
    setDustbins(prevDustbins => {
      const updatedDustbins = prevDustbins.map(dustbin => {
        if (dustbin.id === id) {
          const updated = {
            ...dustbin,
            ...updates,
            lastUpdated: new Date().toISOString(),
            // Auto-update status based on fill level
            status: updates.fillLevel >= 80 ? 'red' : 'green'
          };
          return updated;
        }
        return dustbin;
      });
      saveDustbins(updatedDustbins); // Persist to localStorage
      return updatedDustbins;
    });
    setRoute([]);
  };

  const handleGarageLocationSet = (location) => {
    setGarageLocation(location);
    saveGarageLocation(location); // Persist to localStorage
    setRoute([]);
  };

  const handleDisposalSiteSet = (location) => {
    setDisposalSite(location);
    setRoute([]);
  };

  const handleDisposalSitesUpdate = (sites) => {
    setDisposalSites(sites);
    saveDisposalSites(sites); // Persist to localStorage
  };

  const handleRouteCalculated = (newRoute, newAlternativeRoute, garage, disposal) => {
    setRoute(newRoute);
    setAlternativeRoute(newAlternativeRoute);
    if (garage) setGarageLocation(garage);
    if (disposal) setDisposalSite(disposal);
  };

  const handleRouteStatsChange = (stats) => {
    setRouteStats(stats);
  };

  // Load persisted data on mount
  useEffect(() => {
    const loadedDustbins = loadDustbins();
    const loadedGarage = loadGarageLocation();
    const loadedDisposalSites = loadDisposalSites();
    
    if (loadedDustbins.length > 0) {
      setDustbins(loadedDustbins);
    }
    if (loadedGarage) {
      setGarageLocation(loadedGarage);
    }
    if (loadedDisposalSites.length > 0) {
      setDisposalSites(loadedDisposalSites);
      // Set first disposal site as default if available
      if (!disposalSite && loadedDisposalSites.length > 0) {
        setDisposalSite(loadedDisposalSites[0]);
      }
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-4 mb-8">
          <h1 className="text-4xl font-bold text-center text-gray-800 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-600">
              Smart Waste Management System
            </span>
          </h1>
          <button
            onClick={() => setShowResetModal(true)}
            className="p-2 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg shadow-md border border-gray-200 hover:border-red-300 transition-all duration-200 group"
            title="Reset Application"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4 transform transition-all">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Application?</h3>
                <p className="text-gray-600 mb-6">
                  This will clear all saved data including dustbins, vehicles, routes, garage location, and disposal sites. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetApp}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Reset Everything
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <MapWrapper 
                dustbins={dustbins} 
                onToggleStatus={toggleDustbinStatus}
                onDustbinAdd={handleDustbinAdd}
                onDustbinRemove={handleDustbinRemove}
                onDustbinUpdate={handleDustbinUpdate}
                route={route}
                alternativeRoute={alternativeRoute}
                garageLocation={garageLocation}
                disposalSite={disposalSite}
                onGarageLocationSet={handleGarageLocationSet}
                onDisposalSiteSet={handleDisposalSiteSet}
              />
            </div>

            {/* Fuel Cost & CO₂ Emissions - Below the Map, persists until reset */}
            {routeStats && (() => {
              const activeDistance = routeStats.selectedRoute === 'optimized' 
                ? routeStats.totalDistance 
                : routeStats.alternativeTotalDistance;
              const fuelData = calculateFuelCost(activeDistance, routeStats.selectedVehicleType, routeStats.selectedFuelType);
              const co2Data = calculateCO2Emissions(activeDistance, routeStats.selectedVehicleType, routeStats.selectedFuelType);
              
              // Savings comparison
              const altFuelData = calculateFuelCost(routeStats.alternativeTotalDistance, routeStats.selectedVehicleType, routeStats.selectedFuelType);
              const altCO2Data = calculateCO2Emissions(routeStats.alternativeTotalDistance, routeStats.selectedVehicleType, routeStats.selectedFuelType);
              const optFuelData = calculateFuelCost(routeStats.totalDistance, routeStats.selectedVehicleType, routeStats.selectedFuelType);
              const optCO2Data = calculateCO2Emissions(routeStats.totalDistance, routeStats.selectedVehicleType, routeStats.selectedFuelType);
              const fuelSavings = altFuelData.totalCost - optFuelData.totalCost;
              const co2Savings = altCO2Data.totalEmissions - optCO2Data.totalEmissions;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Fuel Cost Panel */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-200 shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">⛽</span>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Fuel Cost Analysis</h3>
                        <p className="text-xs text-gray-700">Based on Jharkhand fuel prices (as of {JHARKHAND_FUEL_PRICES.lastUpdated})</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-orange-100">
                          <p className="text-xs text-gray-700 mb-1">Fuel Price</p>
                          <p className="text-lg font-bold text-orange-700">₹{fuelData.fuelPrice.toFixed(2)}<span className="text-xs font-normal text-gray-600">/{fuelData.unit === 'kWh' ? 'kWh' : 'L'}</span></p>
                          <p className="text-xs text-gray-600 capitalize">{fuelData.fuelType}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-orange-100">
                          <p className="text-xs text-gray-700 mb-1">Fuel Required</p>
                          <p className="text-lg font-bold text-orange-700">{fuelData.fuelConsumed.toFixed(2)}<span className="text-xs font-normal text-gray-600"> {fuelData.unit}</span></p>
                          <p className="text-xs text-gray-600">for {activeDistance.toFixed(2)} km</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800 font-medium">Total Fuel Cost</span>
                          <span className="text-2xl font-bold text-orange-700">₹{fuelData.totalCost.toFixed(2)}</span>
                        </div>
                      </div>

                      {fuelSavings > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-green-800 font-medium text-sm">💰 Savings vs Baseline</span>
                              <p className="text-xs text-green-700">Optimized route saves fuel</p>
                            </div>
                            <span className="text-lg font-bold text-green-700">₹{fuelSavings.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CO₂ Emissions Panel */}
                  <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl p-5 border border-teal-200 shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">🌍</span>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">CO₂ Emissions</h3>
                        <p className="text-xs text-gray-700">IPCC 2006 / India GHG Program emission factors</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-teal-100">
                          <p className="text-xs text-gray-700 mb-1">Emission Factor</p>
                          <p className="text-lg font-bold text-teal-700">{co2Data.emissionFactor.toFixed(2)}<span className="text-xs font-normal text-gray-600"> kg/L</span></p>
                          <p className="text-xs text-gray-600 capitalize">{co2Data.fuelType} (IPCC)</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-teal-100">
                          <p className="text-xs text-gray-700 mb-1">Fuel Burned</p>
                          <p className="text-lg font-bold text-teal-700">{co2Data.fuelConsumed.toFixed(2)}<span className="text-xs font-normal text-gray-600"> litres</span></p>
                          <p className="text-xs text-gray-600">for {activeDistance.toFixed(2)} km</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border-2 border-teal-300">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800 font-medium">Total CO₂ Emitted</span>
                          <span className="text-2xl font-bold text-teal-700">{co2Data.totalEmissions.toFixed(2)} <span className="text-sm font-normal">kg</span></span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Formula: {co2Data.fuelConsumed.toFixed(2)} L × {co2Data.emissionFactor} kg/L = {co2Data.totalEmissions.toFixed(2)} kg CO₂</p>
                      </div>

                      {co2Data.totalEmissions > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
                            <p className="text-xl font-bold text-green-700">{Math.ceil(co2Data.equivalents.treeDaysAbsorption)}</p>
                            <p className="text-xs text-green-800">tree-days to offset</p>
                            <p className="text-[10px] text-gray-600">1 tree ≈ 0.06 kg CO₂/day</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                            <p className="text-xl font-bold text-blue-700">{co2Data.equivalents.carKmEquivalent.toFixed(1)} km</p>
                            <p className="text-xs text-blue-800">passenger car equivalent</p>
                            <p className="text-[10px] text-gray-600">avg car: 0.21 kg CO₂/km</p>
                          </div>
                        </div>
                      )}

                      {co2Savings > 0 && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-green-800 font-medium text-sm">🌱 CO₂ Saved vs Baseline</span>
                              <p className="text-xs text-green-700">Route optimization reduces emissions</p>
                            </div>
                            <span className="text-lg font-bold text-green-700">{co2Savings.toFixed(2)} kg</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            {/* Fleet Manager */}
            <FleetManager onVehiclesChange={setVehicles} />
            
            {/* Route Optimizer */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-gray-100/50 hover:shadow-2xl transition-all duration-300">
              <RouteOptimizer 
                dustbins={dustbins}
                onRouteCalculated={handleRouteCalculated}
                garageLocation={garageLocation}
                disposalSite={disposalSite}
                vehicles={vehicles}
                onRouteStatsChange={handleRouteStatsChange}
              />
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-gray-100/50 hover:shadow-2xl transition-all duration-300">
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-semibold text-gray-800">System Status</h3>
                </div>
                <p className="text-gray-700 text-sm mb-6">Real-time monitoring of waste management operations</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <StatCard 
                  label="Total Dustbins" 
                  value={dustbins.length}
                  icon="🗑️"
                  trend={dustbins.length > 0 ? '+' : ''}
                />
                <StatCard 
                  label="Needs Collection" 
                  value={dustbins.filter(d => d.fillLevel >= 80 || d.status === 'red').length}
                  icon="🔴"
                  trend="!"
                  urgency={true}
                />
                <StatCard 
                  label="Avg Fill Level" 
                  value={`${Math.round(dustbins.reduce((sum, d) => sum + (d.fillLevel || 0), 0) / (dustbins.length || 1))}%`}
                  icon="📊"
                />
                <StatCard 
                  label="Total Weight" 
                  value={`${(dustbins.reduce((sum, d) => sum + (d.weight || 0), 0) / 1000).toFixed(1)}t`}
                  icon="⚖️"
                />
              </div>
              
              <div className="space-y-4">
                <StatusItem 
                  label="Garage Location" 
                  value={garageLocation ? 'Active' : 'Not Set'}
                  icon="🏢"
                  status={garageLocation ? 'active' : 'inactive'}
                />
                <StatusItem 
                  label="Disposal Site" 
                  value={disposalSite ? 'Active' : 'Not Set'}
                  icon="📍"
                  status={disposalSite ? 'active' : 'inactive'}
                />
        
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// New StatCard component for key metrics
const StatCard = ({ label, value, icon, trend, urgency = false }) => (
  <div className={`p-4 rounded-xl ${
    urgency && value > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
  } border shadow-sm hover:shadow-md transition-all duration-300`}>
    <div className="flex justify-between items-start mb-2">
      <span className="text-2xl">{icon}</span>
      {trend && (
        <span className={`text-sm font-bold ${
          urgency && value > 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          {trend}
        </span>
      )}
    </div>
    <div className="mt-2">
      <h4 className="text-sm text-gray-800">{label}</h4>
      <p className={`text-2xl font-bold ${
        urgency && value > 0 ? 'text-red-700' : 'text-blue-700'
      }`}>
        {value}
      </p>
    </div>
  </div>
);

// Enhanced StatusItem component
const StatusItem = ({ label, value, icon, status }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${statusColors[status]} transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className={`px-3 py-1 rounded-lg ${
        status === 'active' ? 'bg-green-200/50' : 'bg-gray-200/50'
      }`}>
        <span className="font-semibold">{value}</span>
      </div>
    </div>
  );
};
