import { apiCall } from "./client.js";

export const getLastDiagnostics = (serial) => apiCall("/device-diagnostics/last", { deviceID: serial });
export const getLastGps = (serial) => apiCall("/ingest/gps/last", { deviceID: serial });
export const getLastRfid = (serial) => apiCall("/ingest/rfid/last", { deviceID: serial });