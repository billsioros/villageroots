const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";

const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

function randomIndex(length: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % length;
}

function randomChar(chars: string): string {
  return chars[randomIndex(chars.length)];
}

/**
 * Generates a 16-character password that always satisfies validatePassword:
 * lowercase, uppercase, digit, and symbol.
 */
export function generateInitialPassword(): string {
  const pw = new Array<string>(16);

  // Guarantee one character from each required class
  pw[0] = randomChar(LOWERCASE);
  pw[1] = randomChar(UPPERCASE);
  pw[2] = randomChar(DIGITS);
  pw[3] = randomChar(SYMBOLS);

  // Fill the rest randomly
  for (let i = 4; i < 16; i++) {
    pw[i] = randomChar(ALL_CHARS);
  }

  // Shuffle using Fisher-Yates
  for (let i = pw.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }

  return pw.join("");
}
