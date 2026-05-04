export const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024; // 3 MB

export function isImageDataUrl(d: string): boolean {
  return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(d);
}

export function approxDataUrlBytes(d: string): number {
  const commaIdx = d.indexOf(",");
  const b64 = commaIdx >= 0 ? d.slice(commaIdx + 1) : "";
  return Math.floor((b64.length * 3) / 4);
}

export function sanitizeScreenshot(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  if (!isImageDataUrl(raw)) return null;
  if (approxDataUrlBytes(raw) > MAX_SCREENSHOT_BYTES) return null;
  return raw;
}
