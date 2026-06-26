import type { CSSProperties } from "react";

import type { GuestTransaction } from "../../../domain/transactions/transaction";

const avatarThemes = [
  { background: "#dff6ec", color: "#006b55" },
  { background: "#e0f2fe", color: "#075985" },
  { background: "#fef3c7", color: "#92400e" },
  { background: "#ede9fe", color: "#5b21b6" },
  { background: "#ffe4e6", color: "#9f1239" },
  { background: "#dcfce7", color: "#166534" },
  { background: "#fce7f3", color: "#9d174d" },
  { background: "#e2e8f0", color: "#334155" },
];

function hashTransactionSeed(seed: string) {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

export function getTransactionAvatarStyle(
  transaction: Pick<GuestTransaction, "category" | "id" | "type">,
): CSSProperties {
  const seed = `${transaction.type}:${transaction.category}:${transaction.id}`;
  const theme = avatarThemes[hashTransactionSeed(seed) % avatarThemes.length] ?? avatarThemes[0];

  return {
    "--transaction-avatar-bg": theme.background,
    "--transaction-avatar-color": theme.color,
  } as CSSProperties;
}
