type ProfanityPattern = [RegExp, (match: string) => string];

const PROFANITY_PATTERNS: ProfanityPattern[] = [
  [/\bfuck(?:ing|ed|er|ers|s)?\b/gi, maskWord],
  [/\bshit(?:ting|ted|s)?\b/gi, maskWord],
  [/\bcunt(?:s|ing|ed)?\b/gi, maskWord],
  [/\bbastard(?:s)?\b/gi, maskWord],
  [/\bwanker(?:s)?\b/gi, maskWord],
  [/\btwat(?:s)?\b/gi, maskWord],
  [/\bbollocks\b/gi, maskWord],
  [/\bprick(?:s)?\b/gi, maskWord],
  [/\bdickhead(?:s)?\b/gi, maskWord],
  [/\bdick(?:s)?\b/gi, maskWord],
  [/\barsehole(?:s)?\b/gi, maskWord],
  [/\basshole(?:s)?\b/gi, maskWord],
  [/\bcrap\b/gi, maskWord],
];

function maskWord(word: string) {
  if (word.length <= 2) return `${word[0]}*`;

  return `${word[0]}${"*".repeat(Math.max(1, word.length - 2))}${word[word.length - 1]}`;
}

export function maskProfanity(value: string | null | undefined) {
  if (!value) return "";

  return PROFANITY_PATTERNS.reduce((cleaned, [pattern, replacer]) => {
    return cleaned.replace(pattern, replacer);
  }, value);
}
