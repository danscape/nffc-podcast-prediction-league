const PROFANITY_PATTERNS: Array<[RegExp, (match: string) => string]> = [
  [/\bfuck(?:ing|ed|er|ers|s)?\b/gi, maskWord],
  [/\bshit(?:ting|ted|s)?\b/gi, maskWord],
  [/\bcunt(?:s|ing|ed)?\b/gi, maskWord],
  [/\bbastard(?:s)?\b/gi, maskWord],
  [/\bwank(?:er|ers|ing|ed)?\b/gi, maskWord],
  [/\btwat(?:s)?\b/gi, maskWord],
  [/\bbollocks\b/gi, maskWord],
  [/\bprick(?:s)?\b/gi, maskWord],
  [/\bdickhead(?:s)?\b/gi, maskWord],
  [/\bdick(?:s)?\b/gi, maskWord],
  [/\barsehole(?:s)?\b/gi, maskWord],
  [/\basshole(?:s)?\b/gi, maskWord],
];

function maskWord(word: string) {
  return word.replace(/[aeiou]/i, "*");
}

export function maskProfanity(value: string | null | undefined) {
  if (!value) return "";

  return PROFANITY_PATTERNS.reduce((cleaned, [pattern, replacer]) => {
    return cleaned.replace(pattern, replacer);
  }, value);
}
