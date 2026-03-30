import Dexie from 'dexie'

export const db = new Dexie('FuelRecordDB')

db.version(1).stores({
  vehicles: '++id, userId, name, type, plate, initialMileage, currentMileage, createdAt',
  fuelRecords: '++id, userId, vehicleId, date, mileage, liters, pricePerLiter, totalCost, notes, createdAt',
  maintenanceRecords: '++id, userId, vehicleId, date, mileage, itemName, cost, notes, nextMileage, createdAt',
  maintenanceItems: '++id, userId, vehicleType, itemName, intervalKm, notes',
  backups: '++id, userId, createdAt, data',
})

export default db
