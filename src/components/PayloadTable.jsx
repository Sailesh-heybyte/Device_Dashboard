function formatHeader(key) {
  if (!key) return "";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === "") {
    return <span className="cell-empty">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span className={`val-badge ${value ? "pass" : "fail"}`}>
        {value ? "TRUE" : "FALSE"}
      </span>
    );
  }

  const str = String(value).trim();
  const upper = str.toUpperCase();

  if (upper === "PASS") {
    return <span className="val-badge pass">PASS</span>;
  }
  if (upper === "FAIL") {
    return <span className="val-badge fail">FAIL</span>;
  }
  if (upper === "ACTIVE" || upper === "BOARDED" || upper === "OK") {
    return <span className="val-badge status-ok">{str}</span>;
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    const formatted = value.replace("T", " ").replace(/\.\d+Z?$/, " UTC");
    return <span className="cell-mono cell-timestamp">{formatted}</span>;
  }

  if (
    typeof value === "string" &&
    (/^[0-9a-fA-F-]{24,}$/.test(value) || /^[0-9a-fA-F]{8}$/.test(value))
  ) {
    return (
      <span className="cell-mono" title={value}>
        {value}
      </span>
    );
  }

  if (typeof value === "object") {
    return <span className="cell-mono">{JSON.stringify(value)}</span>;
  }

  return <span>{str}</span>;
}

function renderTableGrid(items) {
  if (!items || items.length === 0) {
    return <div className="table-empty-notice">No records available.</div>;
  }

  const isObjectList = items.some(
    (item) => typeof item === "object" && item !== null,
  );

  if (!isObjectList) {
    return (
      <div className="table-wrapper">
        <table className="payload-table">
          <thead>
            <tr>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {items.map((val, idx) => (
              <tr key={idx}>
                <td>{formatCellValue(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const keySet = new Set();
  items.forEach((item) => {
    if (item && typeof item === "object") {
      Object.keys(item).forEach((k) => keySet.add(k));
    }
  });

  const columns = Array.from(keySet);
  if (columns.length === 0) {
    return <div className="table-empty-notice">Empty records.</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="payload-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{formatHeader(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {columns.map((col) => (
                <td key={col}>{formatCellValue(row?.[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PayloadTable({ body }) {
  if (!body) {
    return <div className="empty-state">No payload available.</div>;
  }

  if (Array.isArray(body)) {
    return renderTableGrid(body);
  }

  if (typeof body === "object") {
    const entries = Object.entries(body);
    const arrayEntries = entries.filter(([, val]) => Array.isArray(val));
    const scalarEntries = entries.filter(([, val]) => !Array.isArray(val));

    if (arrayEntries.length > 0) {
      return (
        <div className="table-subgroup-container">
          {scalarEntries.length > 0 && (
            <div className="table-subgroup">
              <div className="table-subgroup-header">
                <h4>Summary</h4>
              </div>
              {renderTableGrid([Object.fromEntries(scalarEntries)])}
            </div>
          )}
          {arrayEntries.map(([key, val]) => (
            <div key={key} className="table-subgroup">
              <div className="table-subgroup-header">
                <h4>{formatHeader(key)}</h4>
                <span className="record-count">
                  {val.length} {val.length === 1 ? "record" : "records"}
                </span>
              </div>
              {val.length === 0 ? (
                <div className="table-empty-notice">
                  No {formatHeader(key).toLowerCase()} recorded.
                </div>
              ) : (
                renderTableGrid(val)
              )}
            </div>
          ))}
        </div>
      );
    }

    return renderTableGrid([body]);
  }

  return (
    <div className="table-wrapper">
      <table className="payload-table">
        <thead>
          <tr>
            <th>Response</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{String(body)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
