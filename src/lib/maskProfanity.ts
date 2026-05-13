const PROFANITY_PATTERNS = [
  /\bfucking\b/gi,
  /\bfucker\b/gi,
  /\bfucked\b/gi,
  /\bfuck\b/gi,
  /\bbullshit\b/gi,
  /\bshit\b/gi,
  /\bshite\b/gi,
  /\bbastard\b/gi,
  /\bwanker\b/gi,
  /\btwat\b/gi,
  /\bcunt\b/gi,
  /\bprick\b/gi,
  /\bdick\b/gi,
  /\bcock\b/gi,
  /\bpiss\b/gi,
  /\barse\b/gi,
  /\basshole\b/gi,
];

function maskWord(match: string) {
  if (match.length <= 1) return "*";
  if (match.length === 2) return `${match[0]}*`;

  return `${match[0]}${"*".repeat(match.length - 2)}${match[match.length - 1]}`;
}

export function maskProfanity(value: string | null | undefined) {
  if (!value) return value ?? null;

  return PROFANITY_PATTERNS.reduce((text, pattern) => {
    return text.replace(pattern, maskWord);
  }, value);
}
