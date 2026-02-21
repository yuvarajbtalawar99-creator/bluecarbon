/**
 * BHARAT BLUE CARBON REGISTRY
 * Offline Storage Service (IndexedDB)
 * 
 * Provides a resilient, local-first queue for GPS points and audit trails.
 */

const DB_NAME = 'BlueCarbonRegistry';
const DB_VERSION = 1;
const STORE_NAME = 'gps_points_queue';

export interface GPSPoint {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    projectId: string;
    deviceId: string;
    isSynced: boolean;
}

class OfflineStorage {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
                    store.createIndex('synced', 'isSynced', { unique: false });
                    store.createIndex('projectId', 'projectId', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = () => reject('Failed to open IndexedDB');
        });
    }

    private async ensureDb(): Promise<void> {
        if (!this.db) await this.init();
    }

    async savePoint(point: GPSPoint): Promise<void> {
        await this.ensureDb();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('DB not initialized');
                return;
            }
            const transaction = this.db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(point);

            request.onsuccess = () => resolve();
            request.onerror = () => reject('Failed to save GPS point');
        });
    }

    async getUnsyncedPoints(): Promise<GPSPoint[]> {
        await this.ensureDb();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('DB not initialized');
                return;
            }
            const transaction = this.db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('synced');
            const request = index.getAll(0); // 0 corresponds to false for boolean index

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Failed to fetch unsynced points');
        });
    }

    async getUnsyncedCount(): Promise<number> {
        await this.ensureDb();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject('DB not initialized');
                return;
            }
            const transaction = this.db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('synced');
            const request = index.count(0);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Failed to count unsynced points');
        });
    }

    async markAsSynced(timestamps: number[]): Promise<void> {
        await this.ensureDb();
        if (!this.db) return;
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        for (const ts of timestamps) {
            const getReq = store.get(ts);
            getReq.onsuccess = () => {
                if (getReq.result) {
                    getReq.result.isSynced = true;
                    store.put(getReq.result);
                }
            };
        }

        return new Promise((resolve) => {
            transaction.oncomplete = () => resolve();
        });
    }

    async clearSyncedPoints(): Promise<void> {
        await this.ensureDb();
        if (!this.db) return;
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('synced');
        const request = index.openCursor(1); // 1 = true

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };

        return new Promise((resolve) => {
            transaction.oncomplete = () => resolve();
        });
    }
}

export const offlineStorage = new OfflineStorage();
