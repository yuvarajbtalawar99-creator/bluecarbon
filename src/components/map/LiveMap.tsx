import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

import { gpsService, GPSStats } from '@/lib/gps/gpsService';
import { GPSPoint } from '@/lib/gps/offlineStorage';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Project {
    id: string;
    name: string;
    lat?: number;
    lng?: number;
    area?: string;
    status: string;
    risk_score?: number;
    plantation_type?: string;
    ecosystem?: string;
    [key: string]: any;
}

interface LiveMapProps {
    projects?: Project[];
    height?: string;
    projectId?: string;
    isRecording?: boolean;
    onStatsUpdate?: (stats: GPSStats) => void;
}

// User Location Marker Component
const UserMarker = ({ point }: { point: GPSPoint | null }) => {
    if (!point) return null;
    return (
        <CircleMarker
            center={[point.lat, point.lng]}
            radius={8}
            pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.4,
                weight: 2
            }}
        >
            <Popup>
                <div className="text-[10px] font-bold">Your Current Position</div>
                <div className="text-[9px] text-slate-500 font-mono">
                    {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                </div>
            </Popup>
            <CircleMarker
                center={[point.lat, point.lng]}
                radius={3}
                pathOptions={{
                    color: 'white',
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    weight: 1
                }}
            />
        </CircleMarker>
    );
};

// Heatmap Layer Component
const HeatmapLayer = ({ points }: { points: [number, number, number][] }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // @ts-ignore - leaflet.heat is not fully typed
        const heat = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.2: 'blue',
                0.4: 'cyan',
                0.6: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [map, points]);

    return null;
};

// NDVILayer Component - Simulates Google Earth Engine NDVI Output
const NDVIGradientLegend = () => {
    return (
        <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-lg border border-slate-200 shadow-xl">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Vegetation Index (NDVI)</div>
            <div className="flex items-center gap-2">
                <div className="h-24 w-4 rounded-full bg-gradient-to-t from-red-500 via-yellow-400 to-green-600 border border-slate-300 relative">
                    <div className="absolute -right-4 top-0 text-[10px] font-mono leading-none">1.0</div>
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono leading-none">0.0</div>
                    <div className="absolute -right-4 bottom-0 text-[10px] font-mono leading-none">-1.0</div>
                </div>
                <div className="flex flex-col justify-between h-24 text-[9px] font-bold text-slate-700">
                    <span>Healthy Mangrove</span>
                    <span>Mod. Vegetation</span>
                    <span>Water / Soil</span>
                </div>
            </div>
        </div>
    );
};

// Map Controller to auto-fit bounds
const MapController = ({ projects, center, zoom, userPoint }: { projects: Project[], center: [number, number], zoom: number, userPoint: GPSPoint | null }) => {
    const map = useMap();

    useEffect(() => {
        const validProjects = projects.filter(p => p.lat && p.lng);
        if (userPoint) {
            map.setView([userPoint.lat, userPoint.lng], 16);
        } else if (validProjects.length > 0) {
            const bounds = L.latLngBounds(validProjects.map(p => [p.lat!, p.lng!]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        } else {
            map.setView(center, zoom);
        }
    }, [projects, map, center, zoom, userPoint]);

    return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({
    projects = [],
    height = "400px",
    projectId = "NEW",
    isRecording = false,
    onStatsUpdate
}) => {
    const [userPoint, setUserPoint] = useState<GPSPoint | null>(null);

    // GPS Tracking Logic
    useEffect(() => {
        if (isRecording) {
            gpsService.onUpdate = (stats, point) => {
                if (point) setUserPoint(point);
                if (onStatsUpdate) onStatsUpdate(stats);
            };
            gpsService.startTracking(projectId);
        } else {
            gpsService.stopTracking();
            // Optional: reset user point or keep last known?
        }

        return () => {
            gpsService.stopTracking();
        };
    }, [isRecording, projectId, onStatsUpdate]);

    // Default center (India)
    const center: [number, number] = [20.5937, 78.9629];

    // transform projects to heatmap points [lat, lng, intensity]
    const heatmapPoints: [number, number, number][] = projects
        .filter(p => p.lat && p.lng)
        .map(p => [
            p.lat!,
            p.lng!,
            0.8 // Default high intensity for mangrove clusters
        ]);

    return (
        <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200 group" style={{ height }}>
            <MapContainer
                center={center}
                zoom={5}
                style={{ height: '100%', width: '100%', background: '#0f172a' }}
                scrollWheelZoom={false}
            >
                <MapController projects={projects} center={center} zoom={5} userPoint={userPoint} />
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Satellite (Sentinel-2)">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.BaseLayer name="Street Map">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>

                    <LayersControl.Overlay checked name="NDVI Heatmap">
                        <LayerGroup>
                            {heatmapPoints.length > 0 && <HeatmapLayer points={heatmapPoints} />}
                        </LayerGroup>
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="Project Markers">
                        <LayerGroup>
                            {projects.filter(p => p.lat && p.lng).map(p => (
                                <CircleMarker
                                    key={p.id}
                                    center={[p.lat!, p.lng!]}
                                    radius={4}
                                    pathOptions={{
                                        color: p.status === 'verified' ? '#10b981' : p.status === 'rejected' ? '#ef4444' : '#f59e0b',
                                        fillColor: p.status === 'verified' ? '#10b981' : p.status === 'rejected' ? '#ef4444' : '#f59e0b',
                                        fillOpacity: 0.7
                                    }}
                                >
                                    <Popup>
                                        <div className="p-2 min-w-[150px]">
                                            <div className="text-xs font-bold text-slate-900 mb-1">{p.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono mb-2">{p.id}</div>
                                            <div className="flex gap-2 mb-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white ${p.status === 'verified' ? 'bg-emerald-500' : p.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                                                    }`}>{p.status}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                                                <span>Area:</span> <span className="font-bold">{p.area || 'N/A'}</span>
                                                <span>Ecosystem:</span> <span className="font-bold capitalize">{p.plantation_type || p.ecosystem || 'Unknown'}</span>
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            ))}
                        </LayerGroup>
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="My Location">
                        <UserMarker point={userPoint} />
                    </LayersControl.Overlay>
                </LayersControl>
                <div className="leaflet-bottom leaflet-left">
                    <div className="leaflet-control leaflet-bar">
                        <NDVIGradientLegend />
                    </div>
                </div>
            </MapContainer>
        </div>
    );
};

