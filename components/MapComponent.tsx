
import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Use CDN for default icons to avoid bundler asset resolution issues
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
    center?: [number, number]; // [lat, lng]
    zoom?: number;
    markers?: Array<{
        lat: number;
        lng: number;
        title: string;
        type: 'courier' | 'pharmacy' | 'patient';
    }>;
}

export const MapComponent: React.FC<MapComponentProps> = ({ 
    center = [-6.7924, 39.2083], // Default Dar es Salaam
    zoom = 13,
    markers = []
}) => {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && !mapRef.current) {
            mapRef.current = L.map(containerRef.current).setView(center, zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapRef.current);
        }

        // Update view if center changes
        if (mapRef.current) {
            mapRef.current.setView(center, zoom);
        }

        // Update markers if map exists
        if (mapRef.current) {
            // Clear existing markers (basic approach for demo)
            mapRef.current.eachLayer((layer) => {
                if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
                    mapRef.current?.removeLayer(layer);
                }
            });

            markers.forEach(m => {
                const color = m.type === 'courier' ? '#3B82F6' : m.type === 'pharmacy' ? '#10B981' : '#EF4444';
                
                // Create a simple colored circle marker instead of custom icon to keep it simple and robust
                const circle = L.circleMarker([m.lat, m.lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
                
                circle.bindPopup(`<b>${m.title}</b><br>${m.type}`).addTo(mapRef.current!);
            });
        }

        // Cleanup on unmount to prevent "Map container is already initialized" error
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        
    }, [center, zoom, JSON.stringify(markers)]); // Re-run if props change

    return <div ref={containerRef} className="w-full h-full rounded-2xl z-0" style={{ minHeight: '300px' }} />;
};
