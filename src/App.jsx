import { useState } from "react";
import {
  getLastDiagnostics,
  getLastGps,
  getLastRfid,
} from "./api/deviceDebug.js";
import PayloadTable from "./components/PayloadTable.jsx";
import "./App.scss";

const ENDPOINTS = [
  { label: "Diagnostics", fetcher: getLastDiagnostics },
  { label: "GPS",         fetcher: getLastGps },
  { label: "RFID",        fetcher: getLastRfid },
];

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
    for (const ep of ENDPOINTS) {
      initialLoadState[ep.label] = { loading: true };
    }
    setResults(initialLoadState);

    const fetchPromises = ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await endpoint.fetcher(trimmedSerial);
        const cardData = {
          label: endpoint.label,
          url: response.url,
          status: response.status,
          elapsed: response.elapsed,
          body: response.body,
          error: null,
          loading: false,
        };

        setResults((prev) => ({ ...prev, [endpoint.label]: cardData }));
        return cardData;
      } catch (err) {
        const errorData = {
          label: endpoint.label,
          url: "",
          status: null,
          elapsed: 0,
          body: null,
          error: err.message || "Network request failed",
          loading: false,
        };

        setResults((prev) => ({ ...prev, [endpoint.label]: errorData }));
        return errorData;
      }
    });

    await Promise.allSettled(fetchPromises);
    setIsFetching(false);
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
          <h3>Device Lookup</h3>
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
        {ENDPOINTS.map((endpoint) => {
          const card = results[endpoint.label];

          if (!card) {
            return (
              <div key={endpoint.label} className="card result-card">
                <div className="card-header">
                  <h3>{endpoint.label}</h3>
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
              <div key={endpoint.label} className="card result-card">
                <div className="card-header">
                  <h3>{endpoint.label}</h3>
                </div>
                <div className="card-body">
                  <div className="card-loading">
                    <div className="loading-spinner" />
                    <span>Fetching {endpoint.label} payload...</span>
                  </div>
                </div>
              </div>
            );
          }

          const is2xx = card.status >= 200 && card.status < 300;

          return (
            <div key={endpoint.label} className="card result-card">
              <div className="card-header">
                <h3>{endpoint.label}</h3>
                {card.body && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleCopy(endpoint.label, card.body)}
                  >
                    {copiedCard === endpoint.label ? "Copied" : "Copy"}
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
                    <div className="result-meta">
                      <span
                        className={`status-badge ${
                          is2xx ? "status-success" : "status-error"
                        }`}
                      >
                        Status: {card.status}
                      </span>
                      <span className="result-time">{card.elapsed} ms</span>
                      <span className="result-url">{card.url}</span>
                    </div>

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