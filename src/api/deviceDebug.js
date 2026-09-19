import { apiCall } from "./client.js";

export const getLastDiagnostics = (serial) => apiCall("/device-diagnostics/last", { deviceID: serial });
export const getLastGps = (serial) => apiCall("/ingest/gps/last", { deviceID: serial });
export const getLastRfid = (serial) => apiCall("/ingest/rfid/last", { deviceID: serial });

const ENDPOINT_MAP = [
  { label: "Diagnostics", fetcher: getLastDiagnostics },
  { label: "GPS",         fetcher: getLastGps },
  { label: "RFID",        fetcher: getLastRfid },
];

export const fetchAllDeviceDebugData = async (serial) => {
  const promises = ENDPOINT_MAP.map(async ({ label, fetcher }) => {
    try {
      const data = await fetcher(serial);
      return {
        label,
        status: data.status,
        body: data.body,
        error: null,
      };
    } catch (err) {
      return {
        label,
        status: null,
        body: null,
        error: err.message || "Network request failed",
      };
    }
  });

  const settled = await Promise.allSettled(promises);
  const results = {};

  settled.forEach((outcome, idx) => {
    const { label } = ENDPOINT_MAP[idx];
    if (outcome.status === "fulfilled") {
      results[label] = outcome.value;
    } else {
      results[label] = {
        label,
        status: null,
        body: null,
        error: outcome.reason?.message || "Request failed",
      };
    }
  });

  return results;
};