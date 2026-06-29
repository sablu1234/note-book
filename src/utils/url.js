export function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).toString();
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return "";
    }
  }
}

export function faviconFor(url) {
  try {
    const origin = new URL(url).origin;
    return `chrome://favicon/size/32@1x/${origin}`;
  } catch {
    return "";
  }
}

export function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
