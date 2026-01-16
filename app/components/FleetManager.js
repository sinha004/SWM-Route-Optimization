'use client';

import { useState, useEffect } from 'react';
import { getAllVehicleTypes, getVehicleIcon, VEHICLE_STATUS } from '../../constants/vehicleTypes';
import { saveVehicles, loadVehicles } from '../../lib/storage';

const FleetManager = ({ onVehiclesChange }) => {
  const [vehicles, setVehicles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  useEffect(() => {
    const loadedVehicles = loadVehicles();
    setVehicles(loadedVehicles);
    if (onVehiclesChange) {
      onVehiclesChange(loadedVehicles);
    }
  }, []);

  const handleAddVehicle = (vehicle) => {
    const newVehicle = {
      ...vehicle,
      id: Date.now(),
      status: VEHICLE_STATUS.AVAILABLE,
      currentLoad: 0,
      totalKmDriven: 0,
      lastMaintenance: new Date().toISOString()
    };
    const updated = [...vehicles, newVehicle];
    setVehicles(updated);
    saveVehicles(updated);
    if (onVehiclesChange) {
      onVehiclesChange(updated);
    }
  };

  const handleUpdateVehicle = (id, updates) => {
    const updated = vehicles.map(v => v.id === id ? { ...v, ...updates } : v);
    setVehicles(updated);
    saveVehicles(updated);
    if (onVehiclesChange) {
      onVehiclesChange(updated);
    }
  };

  const handleDeleteVehicle = (id) => {
    if (confirm('Are you sure you want to remove this vehicle from the fleet?')) {
      const updated = vehicles.filter(v => v.id !== id);
      setVehicles(updated);
      saveVehicles(updated);
      if (onVehiclesChange) {
        onVehiclesChange(updated);
      }
    }
  };

  const availableVehicles = vehicles.filter(v => v.status === VEHICLE_STATUS.AVAILABLE);
  const inUseVehicles = vehicles.filter(v => v.status === VEHICLE_STATUS.IN_USE);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Fleet Management</h2>
            </div>
            <p className="text-purple-100 text-sm">Manage vehicles and assignments</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium shadow-lg"
          >
            + Add Vehicle
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Fleet Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Vehicles"
            value={vehicles.length}
            icon="🚛"
            color="bg-blue-50 border-blue-200"
          />
          <StatCard
            label="Available"
            value={availableVehicles.length}
            icon="✅"
            color="bg-green-50 border-green-200"
          />
          <StatCard
            label="In Use"
            value={inUseVehicles.length}
            icon="🚦"
            color="bg-amber-50 border-amber-200"
          />
        </div>

        {/* Vehicle List */}
        {vehicles.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-6xl mb-4 block">🚚</span>
            <p className="text-gray-700 mb-4">No vehicles in fleet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={() => {
                  setEditingVehicle(vehicle);
                  setShowAddModal(true);
                }}
                onDelete={() => handleDeleteVehicle(vehicle.id)}
                onStatusChange={(status) => handleUpdateVehicle(vehicle.id, { status })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <VehicleFormModal
          vehicle={editingVehicle}
          onClose={() => {
            setShowAddModal(false);
            setEditingVehicle(null);
          }}
          onSave={(vehicle) => {
            if (editingVehicle) {
              handleUpdateVehicle(editingVehicle.id, vehicle);
            } else {
              handleAddVehicle(vehicle);
            }
            setShowAddModal(false);
            setEditingVehicle(null);
          }}
        />
      )}
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, icon, color }) => (
  <div className={`p-4 rounded-xl ${color} border shadow-sm`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
    </div>
    <p className="text-sm text-gray-800">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const VehicleCard = ({ vehicle, onEdit, onDelete, onStatusChange }) => {
  const vehicleTypes = getAllVehicleTypes();
  const vehicleType = vehicleTypes.find(t => t.id === vehicle.vehicleType);
  
  const statusColors = {
    [VEHICLE_STATUS.AVAILABLE]: 'bg-green-100 text-green-800 border-green-300',
    [VEHICLE_STATUS.IN_USE]: 'bg-amber-100 text-amber-800 border-amber-300',
    [VEHICLE_STATUS.MAINTENANCE]: 'bg-orange-100 text-orange-800 border-orange-300',
    [VEHICLE_STATUS.OUT_OF_SERVICE]: 'bg-red-100 text-red-800 border-red-300'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{vehicleType?.icon || '🚚'}</span>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{vehicle.name}</h3>
              <p className="text-sm text-gray-700">{vehicleType?.name || vehicle.vehicleType}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm mt-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-800 font-medium">Capacity:</span>
              <span className="font-semibold text-gray-900">{vehicleType?.capacity || 0} kg</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-800 font-medium">Mileage:</span>
              <span className="font-semibold text-gray-900">{vehicleType?.fuelEfficiency || 0} km/L</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-800 font-medium">License:</span>
              <span className="font-semibold text-gray-900">{vehicle.licensePlate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-800 font-medium">Driver:</span>
              <span className="font-semibold text-gray-900">{vehicle.driverName || 'Unassigned'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[vehicle.status]}`}>
            {vehicle.status}
          </span>
          
          <div className="flex gap-1">
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const VehicleFormModal = ({ vehicle, onClose, onSave }) => {
  const vehicleTypes = getAllVehicleTypes();
  const [formData, setFormData] = useState({
    name: vehicle?.name || '',
    vehicleType: vehicle?.vehicleType || 'standard',
    licensePlate: vehicle?.licensePlate || '',
    driverName: vehicle?.driverName || ''
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.vehicleType || !formData.licensePlate) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[2000] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
              placeholder="e.g., Truck 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type *
            </label>
            <select
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
            >
              {vehicleTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Plate *
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
              placeholder="e.g., JH01AB1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Driver Name
            </label>
            <input
              type="text"
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-500"
              placeholder="e.g., Rajesh Kumar"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            {vehicle ? 'Update' : 'Add'} Vehicle
          </button>
        </div>
      </div>
    </div>
  );
};

export default FleetManager;
