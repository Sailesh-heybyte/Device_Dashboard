import { useState } from "react";
import { fetchAllDeviceDebugData } from "./api/deviceDebug.js";
import PayloadTable from "./components/PayloadTable.jsx";
import "./App.scss";

const CARD_LABELS = ["Diagnostics", "GPS", "RFID"];

export default function App() {
  const [serial, setSerial] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [results, setResults] = useState({});
  const [copiedCard, setCopiedCard] = useState(null);

  const isFetchDisabled = isFetching || !serial.trim();

  const handleFetch = async (event) => {
    event.preventDefault();
    if (isFetchDisabled) return;

    const trimmedSerial = serial.trim();
    setIsFetching(true);

    const initialLoadState = {};
    for (const label of CARD_LABELS) {
      initialLoadState[label] = { loading: true };
    }
    setResults(initialLoadState);

    try {
      const debugData = await fetchAllDeviceDebugData(trimmedSerial);
      setResults(debugData);
    } catch (err) {
      const errorResults = {};
      for (const label of CARD_LABELS) {
        errorResults[label] = {
          status: null,
          body: null,
          error: err.message || "Network request failed",
        };
      }
      setResults(errorResults);
    } finally {
      setIsFetching(false);
    }
  };

  const handleCopy = async (label, body) => {
    if (!body) return;
    const textToCopy =
      typeof body === "object" ? JSON.stringify(body, null, 2) : String(body);
    await navigator.clipboard.writeText(textToCopy);
    setCopiedCard(label);
    setTimeout(() => setCopiedCard(null), 2000);
  };

  return (
    <div className="console-container">
      <div className="page-title">
        <div>
          <h2>Device Debug Console</h2>
          <p>Live device diagnostics, GPS tracking, and RFID ingest payloads</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-header-title">
            <h3>Device Lookup</h3>
          </div>
        </div>
        <form onSubmit={handleFetch} className="console-form">
          <div className="form-row form-input-row">
            <div className="form-field form-field-full">
              <label htmlFor="deviceSerial">Device Serial</label>
              <input
                id="deviceSerial"
                type="text"
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                placeholder="Enter device serial number (e.g. TAMS0001)"
                autoFocus
              />
            </div>
            <div className="form-actions-inline">
              <button
                type="submit"
                className="primary-button"
                disabled={isFetchDisabled}
              >
                {isFetching ? "Fetching..." : "Fetch"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="results-grid">
        {CARD_LABELS.map((label) => {
          const card = results[label];

          if (!card) {
            return (
              <div key={label} className="card result-card">
                <div className="card-header">
                  <div className="card-header-title">
                    <h3>{label}</h3>
                  </div>
                </div>
                <div className="card-body">
                  <div className="empty-state">
                    Enter a device serial and click Fetch.
                  </div>
                </div>
              </div>
            );
          }

          if (card.loading) {
            return (
              <div key={label} className="card result-card">
                <div className="card-header">
                  <div className="card-header-title">
                    <h3>{label}</h3>
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-loading">
                    <div className="loading-spinner" />
                    <span>Fetching {label} payload...</span>
                  </div>
                </div>
              </div>
            );
          }

          const is2xx = card.status >= 200 && card.status < 300;

          return (
            <div key={label} className="card result-card">
              <div className="card-header">
                <div className="card-header-title">
                  <h3>{label}</h3>
                  {card.status !== null && card.status !== undefined && (
                    <span
                      className={`status-badge ${
                        is2xx ? "status-success" : "status-error"
                      }`}
                    >
                      Status: {card.status}
                    </span>
                  )}
                </div>
                {card.body && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleCopy(label, card.body)}
                  >
                    {copiedCard === label ? "Copied JSON" : "Copy JSON"}
                  </button>
                )}
              </div>

              <div className="card-body">
                {card.error ? (
                  <div className="network-error">
                    <strong>Network error:</strong> {card.error}
                  </div>
                ) : (
                  <>
                    {card.status === 404 && (
                      <div className="status-notice">
                        No data for this serial yet.
                      </div>
                    )}

                    {card.status === 400 && (
                      <div className="status-notice warning">
                        Not mapped to a bus.
                      </div>
                    )}

                    {card.status !== 404 && card.status !== 400 && (
                      <PayloadTable body={card.body} />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}