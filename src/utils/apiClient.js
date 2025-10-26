const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const DEFAULT_CREDENTIALS = (import.meta.env.VITE_API_CREDENTIALS ?? "same-origin").trim() || "same-origin";

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function isAbsoluteUrl(path) {
  return /^https?:\/\//i.test(path);
}

const configuredBase = rawBaseUrl ? ensureTrailingSlash(rawBaseUrl.replace(/\s+/g, "")) : "";
const runtimeFallbackBase =
  typeof window !== "undefined"
    ? ensureTrailingSlash(window.location.origin)
    : "http://localhost/";

const baseForRelativeResolution = configuredBase || runtimeFallbackBase;

export function resolveApiUrl(path) {
  if (!path || typeof path !== "string") {
    throw new TypeError("API path must be a non-empty string.");
  }

  if (isAbsoluteUrl(path)) {
    return path;
  }

  return new URL(path, baseForRelativeResolution).toString();
}

export function apiFetch(path, options = {}) {
  const url = resolveApiUrl(path);
  const fetchOptions = { ...options };

  if (!Object.prototype.hasOwnProperty.call(fetchOptions, "credentials")) {
    fetchOptions.credentials = DEFAULT_CREDENTIALS;
  }

  return fetch(url, fetchOptions);
}

export function buildApiUrl(path, searchParams) {
  const url = new URL(resolveApiUrl(path));

  if (searchParams && typeof searchParams === "object") {
    const entries =
      searchParams instanceof URLSearchParams
        ? Array.from(searchParams.entries())
        : Object.entries(searchParams);

    for (const [key, value] of entries) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export const apiConfig = {
  baseUrl: configuredBase ? configuredBase.replace(/\/$/, "") : runtimeFallbackBase.replace(/\/$/, ""),
  credentials: DEFAULT_CREDENTIALS
};
