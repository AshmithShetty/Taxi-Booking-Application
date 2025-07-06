// frontend/src/components/RoutingMachine.jsx
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import { useMap } from 'react-leaflet';

// Fix default Leaflet icon issue with bundlers like Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
// --- End Icon Fix ---

const RoutingMachine = ({ start, end, onRouteFound }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !start || !end) return;

    // Check if start and end are the same
    if (start.lat === end.lat && start.lng === end.lng) {
      console.warn("Routing Machine: Start and end points are the same.");
      // Optionally remove existing route if points become the same
      map.eachLayer(layer => {
        if (layer.options && layer.options.id === 'routing-control') {
          map.removeLayer(layer);
        }
      });
       if (typeof onRouteFound === 'function') {
         onRouteFound(null, 0); // Indicate no route, zero distance
       }
      return; // Don't add a route
    }

    // Clear previous routes first
    let existingControl = null;
    map.eachLayer(layer => {
        // A bit fragile, relies on internal property or needs better identification
        if (layer.options && layer.options.id === 'routing-control') {
           existingControl = layer;
        }
    });
    if (existingControl) {
        map.removeControl(existingControl);
         // Also try removing the layer if it was added separately (depends on how control adds itself)
         map.removeLayer(existingControl);
    }


    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
      ],
      routeWhileDragging: false, // Performance
      addWaypoints: false, // Don't allow user to add mid-points easily
      draggableWaypoints: false, // Don't allow dragging waypoints
      fitSelectedRoutes: true,
      showAlternatives: false,
       lineOptions: {
           styles: [{ color: '#5b89ac', opacity: 0.8, weight: 6 }], // Style the route line
           // Add id to potentially remove it later more reliably
           // id: 'routing-line' // Note: lineOptions might not support 'id' directly
       },
       // Give the control an ID to help find/remove it
       id: 'routing-control' // Note: L.Routing.control might not directly support 'id' option
                               // We rely on checking layers/controls later
    }).addTo(map);

    // Add listener for when route is found
    routingControl.on('routesfound', function(e) {
        if (e.routes && e.routes.length > 0) {
            const route = e.routes[0];
            const distanceMeters = route.summary.totalDistance;
             if (typeof onRouteFound === 'function') {
                onRouteFound(route, distanceMeters); // Pass full route and distance
             }
        } else {
             if (typeof onRouteFound === 'function') {
                onRouteFound(null, 0); // No route found
             }
        }
    });

     routingControl.on('routingerror', function(e) {
        console.error("Routing Error:", e.error);
         if (typeof onRouteFound === 'function') {
             onRouteFound(null, 0); // Indicate error by returning 0 distance maybe? Or null? Let's use 0.
         }
         // Optionally show error to user
     });


    // Cleanup function to remove the control when component unmounts or dependencies change
    return () => {
       if (map && routingControl) {
            map.removeControl(routingControl);
             // Attempt to remove the layer as well, checking if it exists
             map.eachLayer(layer => {
                 if (layer instanceof L.Routing.Line || layer instanceof L.Routing.Itinerary || (layer.options && layer.options.id === 'routing-control')) {
                    try {
                       map.removeLayer(layer);
                    } catch (err) {
                       console.warn("Could not remove routing layer:", err);
                    }
                 }
             });
        }
    };
  }, [map, start, end, onRouteFound]); // Re-run effect if map, start, end, or callback changes

  return null; // This component doesn't render anything itself
};

export default RoutingMachine;