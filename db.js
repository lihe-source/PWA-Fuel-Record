// db.js - IndexedDB 操作封裝

const DB_NAME = 'FuelRecordDB';
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains('maintenanceTemplates')) {
        const mts = db.createObjectStore('maintenanceTemplates', { keyPath: 'id', autoIncrement: true });
        mts.createIndex('vehicleType', 'vehicleType');
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

function getAllVehicles() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('vehicles', 'readonly').objectStore('vehicles').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function addVehicle(vehicle) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('vehicles', 'readwrite').objectStore('vehicles').add(vehicle);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function updateVehicle(vehicle) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('vehicles', 'readwrite').objectStore('vehicles').put(vehicle);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function deleteVehicle(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('vehicles', 'readwrite').objectStore('vehicles').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e.target.error);
  }));
}

function getAllRecords() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('records', 'readonly').objectStore('records').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function getRecordsByVehicleId(vehicleId) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('records', 'readonly').objectStore('records').index('vehicleId').getAll(vehicleId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function addRecord(record) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('records', 'readwrite').objectStore('records').add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function updateRecord(record) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('records', 'readwrite').objectStore('records').put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function deleteRecord(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('records', 'readwrite').objectStore('records').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e.target.error);
  }));
}

function clearAllData() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(['vehicles', 'records'], 'readwrite');
    tx.objectStore('vehicles').clear();
    tx.objectStore('records').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  }));
}

function getAllMaintenanceTemplates() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('maintenanceTemplates', 'readonly').objectStore('maintenanceTemplates').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function addMaintenanceTemplate(tmpl) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('maintenanceTemplates', 'readwrite').objectStore('maintenanceTemplates').add(tmpl);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function updateMaintenanceTemplate(tmpl) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('maintenanceTemplates', 'readwrite').objectStore('maintenanceTemplates').put(tmpl);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  }));
}

function deleteMaintenanceTemplate(id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction('maintenanceTemplates', 'readwrite').objectStore('maintenanceTemplates').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = e => reject(e.target.error);
  }));
}

function clearMaintenanceTemplates() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('maintenanceTemplates', 'readwrite');
    tx.objectStore('maintenanceTemplates').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  }));
}

function importData({ vehicles, records }) {
  return clearAllData().then(() => openDB()).then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(['vehicles', 'records'], 'readwrite');
    vehicles.forEach(v => tx.objectStore('vehicles').add(v));
    records.forEach(r => tx.objectStore('records').add(r));
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  }));
}
