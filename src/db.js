import Dexie from 'dexie'

export const db = new Dexie('FuelRecordDB')

db.version(1).stores({
  vehicles: '++id, userId, name, type, plate',
  fuelRecords: '++id, userId, vehicleId, date',
  maintenanceRecords: '++id, userId, vehicleId, date, itemName',
  maintenanceItems: '++id, userId, vehicleType, itemName',
  backups: '++id, userId, createdAt'
})
