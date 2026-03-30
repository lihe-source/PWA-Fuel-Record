// db.js - IndexedDB 操作封裝

const DB_NAME = 'FuelRecordDB';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('vehicles')) {
        const vs = db.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
        vs.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('records')) {
        const rs = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        rs.createIndex('vehicleId', 'vehicleId');
        rs.createIndex('date', 'date');
        rs.createIndex('type', 'type');
      }
    };
    req.onsuccess = e => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = e => reject(e.target.error);
  });
}

function getAllVehicles() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vehicles', 'readonly');
      const req = tx.objectStore('vehicles').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  });
}

function addVehicle(vehicle) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vehicles', 'readwrite');
      const req = tx.objectStore('vehicles').add(vehicle);
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  });
}

function updateVehicle(id, data) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vehicles', 'readwrite');
      const store = tx.objectStore('vehicles');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) { reject(new Error('Vehicle not found')); return; }
        const updated = Object.assign({}, existing, data, { id });
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve(putReq.result);
        putReq.onerror = e => reject(e.target.error);
      };
      getReq.onerror = e => reject(e.target.error);
    });
  });
}

function deleteVehicle(id) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vehicles', 'records'], 'readwrite');
      // Delete all records for this vehicle first
      const recIndex = tx.objectStore('records').index('vehicleId');
      const recReq = recIndex.getAllKeys(id);
      recReq.onsuccess = () => {
        const keys = recReq.result;
        keys.forEach(k => tx.objectStore('records').delete(k));
        tx.objectStore('vehicles').delete(id);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  });
}

function getAllRecords() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const req = tx.objectStore('records').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  });
}

function getRecordsByVehicleId(vehicleId) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const index = tx.objectStore('records').index('vehicleId');
      const req = index.getAll(vehicleId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  });
}

function addRecord(record) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      const req = tx.objectStore('records').add(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  });
}

function deleteRecord(id) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      const req = tx.objectStore('records').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
  });
}

function clearAllData() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vehicles', 'records'], 'readwrite');
      tx.objectStore('vehicles').clear();
      tx.objectStore('records').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  });
}

function importData({ vehicles, records }) {
  return clearAllData().then(() => openDB()).then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['vehicles', 'records'], 'readwrite');
      vehicles.forEach(v => tx.objectStore('vehicles').add(v));
      records.forEach(r => tx.objectStore('records').add(r));
      tx.oncomplete = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  });
}
