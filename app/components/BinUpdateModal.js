'use client';

import { useState } from 'react';
import { getAllWasteTypes } from '../../constants/wasteTypes';
import { getFillLevelColor } from '../../utils/calculations';

const BinUpdateModal = ({ bin, onClose, onUpdate }) => {
  const [fillLevel, setFillLevel] = useState(bin?.fillLevel || 0);
  const [wasteType, setWasteType] = useState(bin?.wasteType || 'general');
  const [weight, setWeight] = useState(bin?.weight || 0);

  const handleSave = () => {
    onUpdate(bin.id, {
      fillLevel,
      wasteType,
      weight
    });
    onClose();
  };

  const wasteTypes = getAllWasteTypes();

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[2000] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🗑️</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Update Bin #{bin?.id}</h3>
          <p className="text-gray-700 mt-1 text-sm">Manually update bin status and information</p>
        </div>
        
        <div className="space-y-5">
          {/* Fill Level */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Fill Level: {fillLevel}%
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={fillLevel}
                onChange={(e) => setFillLevel(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${getFillLevelColor(fillLevel)} ${fillLevel}%, #e5e7eb ${fillLevel}%)`
                }}
              />
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: getFillLevelColor(fillLevel) }}
              >
                {fillLevel}%
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-700 mt-1">
              <span>Empty</span>
              <span>Half</span>
              <span>Full</span>
            </div>
          </div>

          {/* Waste Type */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Waste Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {wasteTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setWasteType(type.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    wasteType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{type.icon}</span>
                    <div className="text-left">
                      <div className="text-xs font-medium text-gray-800">{type.name}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Estimated Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
              placeholder="Enter weight"
              min="0"
              step="0.1"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-700 text-sm">ℹ️</span>
              <div className="text-xs text-blue-900">
                <p className="font-medium mb-1">Auto Status Update:</p>
                <p>Bins with fill level ≥ 80% will automatically be marked for collection (red status).</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-lg"
          >
            Update Bin
          </button>
        </div>
      </div>
    </div>
  );
};

export default BinUpdateModal;
