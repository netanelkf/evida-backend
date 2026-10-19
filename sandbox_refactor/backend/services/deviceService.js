// Device service
import { DeviceProfile } from '../models/index.js';
import rookService from './rookService.js';

export async function getSupportedDevices() {
  const rookCategories = await rookService.getDeviceCategories();

  return {
    categories: rookCategories,
    directIntegrations: [
      { id: 'fitbit_direct', name: 'Fitbit (Direct)', method: 'oauth' }
    ]
  };
}

export async function getConnectedDevices(userId) {
  const devices = await DeviceProfile.findByUser(userId);

  return devices.map(d => ({
    id: d.id,
    deviceType: d.device_type,
    deviceName: d.device_name || d.device_type,
    deviceModel: d.device_model,
    isConnected: d.is_connected,
    connectionMethod: d.connection_method,
    lastSyncAt: d.last_sync_at,
    syncStatus: d.sync_status,
    batteryLevel: d.battery_level
  }));
}

export async function getDeviceStatus(userId, deviceType) {
  const device = await DeviceProfile.findByUserAndType(userId, deviceType);

  if (!device) {
    return { connected: false };
  }

  return {
    connected: device.is_connected,
    lastSync: device.last_sync_at,
    syncStatus: device.sync_status,
    batteryLevel: device.battery_level
  };
}

export async function connectDevice(userId, deviceType, method, data = {}) {
  const existingDevice = await DeviceProfile.findByUserAndType(userId, deviceType);

  if (existingDevice) {
    return DeviceProfile.update(existingDevice.id, {
      is_connected: true,
      connection_method: method,
      ...data
    });
  }

  return DeviceProfile.create({
    user_id: userId,
    device_type: deviceType,
    is_connected: true,
    connection_method: method,
    ...data
  });
}

export async function disconnectDevice(userId, deviceType) {
  const device = await DeviceProfile.findByUserAndType(userId, deviceType);

  if (!device) {
    throw new Error('Device not found');
  }

  await DeviceProfile.disconnect(device.id);
  return { success: true };
}

export async function updateSyncStatus(deviceId, status, error = null) {
  return DeviceProfile.updateSyncStatus(deviceId, status, error);
}

export async function updateBatteryLevel(userId, deviceType, level) {
  const device = await DeviceProfile.findByUserAndType(userId, deviceType);

  if (device) {
    await DeviceProfile.update(device.id, {
      battery_level: level,
      battery_updated_at: new Date()
    });
  }
}

export default {
  getSupportedDevices,
  getConnectedDevices,
  getDeviceStatus,
  connectDevice,
  disconnectDevice,
  updateSyncStatus,
  updateBatteryLevel
};
