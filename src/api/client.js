const BASE_URL = import.meta.env.VITE_API_URL;

export const apiCall = async (path, params) => {
  const query = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}?${query}`;

  const response = await fetch(url, { method: "GET" });
  const text = await response.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return { status: response.status, body };
};