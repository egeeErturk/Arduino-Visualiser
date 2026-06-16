export interface CodeImportResult {
  code: string;
  fileName: string;
  detectedPins: string[];
}

function normalizePinToken(token: string) {
  const trimmed = token.trim().replace(/['"]/g, "");
  if (/^A\d+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  if (/^\d+$/.test(trimmed)) {
    return `D${trimmed}`;
  }
  return trimmed.toUpperCase();
}

export function detectPinsFromCode(code: string) {
  const detected = new Set<string>();
  const patterns = [
    /pinMode\s*\(\s*([^,]+)\s*,/g,
    /digitalWrite\s*\(\s*([^,]+)\s*,/g,
    /digitalRead\s*\(\s*([^)]+)\)/g,
    /analogRead\s*\(\s*([^)]+)\)/g,
    /analogWrite\s*\(\s*([^,]+)\s*,/g,
    /\.attach\s*\(\s*([^)]+)\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      const pin = normalizePinToken(match[1] ?? "");
      if (pin) {
        detected.add(pin);
      }
    }
  }

  return [...detected];
}

export function importCodeContent(code: string, fileName: string): CodeImportResult {
  return {
    code,
    fileName,
    detectedPins: detectPinsFromCode(code),
  };
}
