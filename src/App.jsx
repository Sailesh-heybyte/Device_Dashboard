import { useState } from "react";
import {
  getLastDiagnostics,
  getLastGps,
  getLastRfid,
} from "./api/deviceDebug.js";
import "./App.scss";

const ENDPOINTS = [
  { label: "Diagnostics", fetcher: getLastDiagnostics },
  { label: "GPS", fetcher: getLastGps },
  { label: "RFID", fetcher: getLastRfid },
];

const formatBody = (body) =>
  typeof body === "object" ? JSON.stringify(body, null, 2) : String(body);

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

    const loadingState = {};
    for (const endpoint of ENDPOINTS) {
      loadingState[endpoint.label] = { loading: true };
    }
    setResults(loadingState);

    const requests = ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await endpoint.fetcher(trimmedSerial);
        setResults((prev) => ({
          ...prev,
          [endpoint.label]: {
            url: response.url,
            status: response.status,
            elapsed: response.elapsed,
            body: response.body,
            error: null,
            loading: false,
          },
        }));
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [endpoint.label]: {
            url: null,
            status: null,
            elapsed: null,
            body: null,
            error: err.message,
            loading: false,
          },
        }));
      }
    });

    await Promise.allSettled(requests);
    setIsFetching(false);
  };

  const handleCopy = async (label, body) => {
    await navigator.clipboard.writeText(formatBody(body));
    setCopiedCard(label);
    setTimeout(() => setCopiedCard(null), 2000);
  };

  return (
    <div className="console-container">
      <div className="page-title">
        <div>
          <h2>Device Debug Console</h2>
          <p>
            Temporary tool for firmware QA. Diagnostics, GPS and RFID ingest
            payloads.
          </p>
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
                placeholder="Enter device serial"
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
                    <span>Fetching...</span>
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

                    <pre className="raw-response">{formatBody(card.body)}</pre>
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