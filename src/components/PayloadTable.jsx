function formatHeader(key) {
  if (!key) return "";
  const lower = key.toLowerCase();
  if (lower === "rfid_hex_val") return "RFID Hex Val";
  if (lower === "time_stamp") return "Timestamp";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value) {
  let date = null;

  if (typeof value === "number") {
    if (value > 1e11) {
      date = new Date(value);
    } else if (value > 1e8) {
      date = new Date(value * 1000);
    }
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{10}$/.test(trimmed)) {
      date = new Date(Number(trimmed) * 1000);
    } else if (/^\d{13}$/.test(trimmed)) {
      date = new Date(Number(trimmed));
    } else if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      if (/Z|[+-]\d{2}(?::?\d{2})?$/.test(trimmed)) {
        date = new Date(trimmed);
      } else {
        date = new Date(trimmed.replace(" ", "T") + "Z");
      }
    }
  }

  if (date && !isNaN(date.getTime())) {
    return date
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, " UTC")
      .replace(/Z$/, " UTC");
  }

  return null;
}

function formatCellValue(value, key) {
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

  const formattedTime = formatTimestamp(value);
  if (formattedTime) {
    return <span className="cell-mono cell-timestamp">{formattedTime}</span>;
  }

  const isTimeKey =
    key &&
    /timestamp|time_stamp|tapped_at|posted|datetime|date_time|created_at|last_health_at/i.test(
      key,
    );
  if (isTimeKey && str) {
    return <span className="cell-mono cell-timestamp">{str}</span>;
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

function sortColumns(columns) {
  const getPriority = (col) => {
    const lower = col.toLowerCase();
    // 1. Timestamps first
    if (
      /timestamp|time_stamp|tapped_at|posted|datetime|date_time|scanned_at|created_at|last_health_at/i.test(
        lower,
      )
    ) {
      return 1;
    }
    // 2. Main hardware / entity IDs
    if (/rfid/i.test(lower)) return 2;
    if (/student/i.test(lower)) return 3;
    if (/trip/i.test(lower)) return 4;
    if (/bus/i.test(lower)) return 5;
    if (/serial/i.test(lower)) return 6;
    // 3. Status & Reason at the end
    if (/status/i.test(lower)) return 20;
    if (/reason/i.test(lower)) return 21;
    return 10;
  };

  return [...columns].sort((a, b) => {
    const pA = getPriority(a);
    const pB = getPriority(b);
    if (pA !== pB) return pA - pB;
    return 0;
  });
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

  const columns = sortColumns(Array.from(keySet));
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
                <td key={col}>{formatCellValue(row?.[col], col)}</td>
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
      const scalarObj = Object.fromEntries(scalarEntries);

      return (
        <div className="table-subgroup-container">
          {arrayEntries.map(([key, val]) => {
            const isLastResults = /last_result/i.test(key);
            const processedItems =
              isLastResults && scalarEntries.length > 0 && val.length > 0
                ? val.map((item) => {
                    if (item && typeof item === "object") {
                      return {
                        ...scalarObj,
                        ...item,
                      };
                    }
                    return item;
                  })
                : val;

            return (
              <div key={key} className="table-subgroup">
                <div className="table-subgroup-header">
                  <h4>{formatHeader(key)}</h4>
                  <div className="subgroup-meta">
                    <span className="record-count">
                      {val.length} {val.length === 1 ? "record" : "records"}
                    </span>
                  </div>
                </div>
                {processedItems.length === 0 ? (
                  <div className="table-empty-notice">
                    No {formatHeader(key).toLowerCase()} recorded.
                  </div>
                ) : (
                  renderTableGrid(processedItems)
                )}
              </div>
            );
          })}
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
