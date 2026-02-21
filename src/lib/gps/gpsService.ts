/**
 * BHARAT BLUE CARBON REGISTRY
 * GPS Tracking Service
 * 
 * Production-grade geolocation monitoring with fraud detection.
 */

import { offlineStorage, GPSPoint } from './offlineStorage';

const ACCURACY_THRESHOLD = 20; // Meters
const MAX_SPEED_MS = 15; // ~54km/h - filter out motorized transport or spoofing
const MAX_JUMP_METERS = 50;

export interface GPSStats {
    accuracy: number;
    speed: number | null;
    totalPoints: number;
    status: 'active' | 'inactive' | 'error';
    lastLat: number | null;
    lastLng: number | null;
}

class GPSService {
    private watchId: number | null = null;
    private lastPoint: GPSPoint | null = null;
    private deviceId: string = 'dev-' + Math.random().toString(36).substr(2, 9);
    private currentProjectId: string | null = null;

    public onUpdate: (stats: GPSStats, point: GPSPoint | null) => void = () => { };

    async getCurrentPosition(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        });
    }

    startTracking(projectId: string) {
        if (this.watchId !== null) return;

        this.currentProjectId = projectId;

        if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            return;
        }

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => this.handlePosition(pos),
            (err) => this.handleError(err),
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.lastPoint = null;
        }
    }

    private handlePosition(position: GeolocationPosition) {
        const { latitude, longitude, accuracy, speed } = position.coords;
        const { timestamp } = position;

        // 1. Accuracy Filter
        if (accuracy > ACCURACY_THRESHOLD) {
            console.warn(`Poor GPS accuracy: ${accuracy}m. Skipping point.`);
            this.onUpdate(this.getStats(accuracy, null), null);
            return;
        }

        // 2. Fraud Detection: Velocity Check
        if (speed && speed > MAX_SPEED_MS) {
            console.error(`Fraud Detected: Speed anomaly detected (${speed} m/s)`);
            return;
        }

        const currentPoint: GPSPoint = {
            lat: latitude,
            lng: longitude,
            accuracy,
            timestamp,
            projectId: this.currentProjectId || 'unknown',
            deviceId: this.deviceId,
            isSynced: false
        };

        // 3. Fraud Detection: Significant Jump Check
        if (this.lastPoint) {
            const distance = this.calculateDistance(
                this.lastPoint.lat, this.lastPoint.lng,
                currentPoint.lat, currentPoint.lng
            );

            const timeDiff = (currentPoint.timestamp - this.lastPoint.timestamp) / 1000;
            const inferredSpeed = distance / timeDiff;

            if (distance > MAX_JUMP_METERS && inferredSpeed > MAX_SPEED_MS) {
                console.error(`Fraud Detected: Significant location jump (${distance}m in ${timeDiff}s)`);
                return;
            }
        }

        // 4. Persistence
        offlineStorage.savePoint(currentPoint).catch(err => console.error(err));

        this.lastPoint = currentPoint;
        this.onUpdate(this.getStats(accuracy, speed), currentPoint);
    }

    private handleError(error: GeolocationPositionError) {
        console.error('GPS Error:', error.message);
        this.onUpdate({
            status: 'error',
            accuracy: 0,
            totalPoints: 0,
            speed: null,
            lastLat: null,
            lastLng: null
        }, null);
    }

    private getStats(accuracy: number, speed: number | null): GPSStats {
        return {
            status: 'active',
            accuracy,
            speed,
            totalPoints: 0, // In production, this would be fetched from offlineStorage
            lastLat: this.lastPoint?.lat || null,
            lastLng: this.lastPoint?.lng || null
        };
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}

export const gpsService = new GPSService();
