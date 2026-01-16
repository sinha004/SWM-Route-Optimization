'use client';

import { useEffect, useState, useMemo } from 'react';
import { Polyline } from 'react-leaflet';

/**
 * RoadRoute component - Fetches and displays actual road-based routes using OSRM
 * This is a simpler alternative to leaflet-routing-machine that works better with React
 */
const RoadRoute = ({ waypoints, color = '#3388ff', weight = 5, opacity = 0.8 }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create a stable key for waypoints to trigger effect properly
  const waypointsKey = useMemo(() => {
    if (!waypoints || waypoints.length === 0) return '';
    return waypoints.map(wp => `${wp?.lat},${wp?.lng}`).join('|');
  }, [waypoints]);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!waypoints || waypoints.length < 2) {
        setRouteCoordinates([]);
        return;
      }

      // Validate waypoints have lat/lng
      const validWaypoints = waypoints.filter(wp => 
        wp && typeof wp.lat === 'number' && typeof wp.lng === 'number'
      );
      
      if (validWaypoints.length < 2) {
        setRouteCoordinates([]);
        return;
      }

      setIsLoading(true);

      try {
        // Build OSRM coordinates string: lng,lat;lng,lat;...
        const coordsString = validWaypoints
          .map(wp => `${wp.lng},${wp.lat}`)
          .join(';');

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`,
          { signal: AbortSignal.timeout(15000) }
        );

        if (!response.ok) {
          throw new Error(`OSRM API error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response from OSRM');
        }

        const data = await response.json();

        if (data.routes && data.routes[0] && data.routes[0].geometry) {
          // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
          const coords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRouteCoordinates(coords);
        } else {
          // Fallback to straight lines
          setRouteCoordinates(validWaypoints.map(wp => [wp.lat, wp.lng]));
        }
      } catch (error) {
        console.warn('RoadRoute: Error fetching road route, using straight lines:', error.message);
        // Fallback to straight lines connecting waypoints
        setRouteCoordinates(validWaypoints.map(wp => [wp.lat, wp.lng]));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoute();
  }, [waypointsKey]); // Use stable key instead of waypoints array

  if (routeCoordinates.length < 2) {
    return null;
  }

  return (
    <Polyline
      key={waypointsKey} // Force re-render when waypoints change
      positions={routeCoordinates}
      pathOptions={{
        color: color,
        weight: weight,
        opacity: opacity,
        lineJoin: 'round',
        lineCap: 'round'
      }}
      pane="overlayPane" // Ensure it's rendered on top
    />
  );
};

export default RoadRoute;
