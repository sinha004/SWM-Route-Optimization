'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

/**
 * RoutingMachine component - Uses OSRM to display actual road-based routes
 * @param {Array} waypoints - Array of { lat, lng } objects representing the route waypoints
 * @param {string} color - Color of the route line
 * @param {boolean} showInstructions - Whether to show turn-by-turn instructions
 */
const RoutingMachine = ({ waypoints, color = '#3388ff', showInstructions = false }) => {
  const map = useMap();
  const routingControlRef = useRef(null);
  const mapRef = useRef(map);

  // Keep map reference updated
  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  useEffect(() => {
    // Safety check - ensure map exists
    if (!map) {
      return;
    }

    // Clean up function
    const cleanup = () => {
      if (routingControlRef.current && mapRef.current) {
        try {
          mapRef.current.removeControl(routingControlRef.current);
        } catch (e) {
          // Silently ignore cleanup errors
        }
        routingControlRef.current = null;
      }
    };

    // If no valid waypoints, just cleanup
    if (!waypoints || waypoints.length < 2) {
      cleanup();
      return;
    }

    // Remove existing routing control before creating new one
    cleanup();

    // Convert waypoints to L.latLng format
    const latLngs = waypoints.map(wp => L.latLng(wp.lat, wp.lng));

    try {
      // Create routing control with OSRM
      const routingControl = L.Routing.control({
        waypoints: latLngs,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        show: showInstructions,
        createMarker: () => null, // Don't create markers (we have our own)
        lineOptions: {
          styles: [
            { color: color, opacity: 0.8, weight: 6 },
            { color: 'white', opacity: 0.3, weight: 2 }
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 0
        },
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          timeout: 30000,
          profile: 'driving'
        })
      });

      // Add to map
      routingControl.addTo(map);
      routingControlRef.current = routingControl;

      // Hide the routing instructions panel if not needed
      if (!showInstructions) {
        setTimeout(() => {
          const container = routingControl.getContainer();
          if (container) {
            container.style.display = 'none';
          }
        }, 0);
      }
    } catch (e) {
      console.warn('Error creating routing control:', e);
    }

    // Cleanup on unmount or waypoints change
    return cleanup;
  }, [map, waypoints, color, showInstructions]);

  return null;
};

export default RoutingMachine;
