function formatHeader(key) {
  if (!key) return "";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderCellValue(value) {
  if (value === null || value === undefined || value === "") {
    return <span className="val-badge neutral">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={`val-badge ${value ? "pass" : "fail"}`}>
        {value ? "TRUE" : "FALSE"}
      </span>
    );
  }
  const str = String(value);
  if (str.toUpperCase() === "PASS") {
    return <span className="val-badge pass">PASS</span>;
  }
  if (str.toUpperCase() === "FAIL") {
    return <span className="val-badge fail">FAIL</span>;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return str;
}

function renderTableGrid(items) {
  if (!items || items.length === 0) {
    return <div className="empty-state">No records available.</div>;
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
                <td>{renderCellValue(val)}</td>
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
    return <div className="empty-state">Empty records.</div>;
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
                <td key={col}>{renderCellValue(row?.[col])}</td>
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
              <div className="table-subgroup-title">Summary</div>
              {renderTableGrid([Object.fromEntries(scalarEntries)])}
            </div>
          )}
          {arrayEntries.map(([key, val]) => (
            <div key={key} className="table-subgroup">
              <div className="table-subgroup-title">{formatHeader(key)}</div>
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
