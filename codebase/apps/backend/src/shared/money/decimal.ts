const SCALE = 10_000n;

export function decimalStringToMinorUnits(value: string) {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const [wholePartRaw, fractionalPart = ""] = (negative ? trimmed.slice(1) : trimmed).split(".");
  const wholePart = BigInt(wholePartRaw || "0");
  const normalizedFraction = `${fractionalPart}0000`.slice(0, 4);
  const magnitude = wholePart * SCALE + BigInt(normalizedFraction);

  return negative ? -magnitude : magnitude;
}

export function minorUnitsToDecimalString(value: bigint) {
  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const wholePart = magnitude / SCALE;
  const fractionalPart = (magnitude % SCALE).toString().padStart(4, "0");

  return `${negative ? "-" : ""}${wholePart.toString()}.${fractionalPart}`;
}
