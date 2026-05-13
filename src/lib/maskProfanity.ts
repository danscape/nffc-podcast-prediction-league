const PROFANITY_PATTERNS = [
  /fuck/gi,
  /fucking/gi,
  /fucker/gi,
  /fucked/gi,
  /shit/gi,
  /shite/gi,
  /bullshit/gi,
  /bastard/gi,
  /wanker/gi,
  /twat/gi,
  /cunt/gi,
  /prick/gi,
  /dick/gi,
  /cock/gi,
  /piss/gi,
  /arse/gi,
  /asshole/gi,
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
