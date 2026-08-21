// Shape validation only. Full CRC16 checksum verification comes from
// @stellar/stellar-sdk StrKey once the SDK dependency lands in this repo.

const BASE32 = /^[A-Z2-7]+$/;

export function isAccountId(s: string): boolean {
  return s.length === 56 && s.startsWith("G") && BASE32.test(s);
}

export function isContractId(s: string): boolean {
  return s.length === 56 && s.startsWith("C") && BASE32.test(s);
}

export function isAddress(s: string): boolean {
  return isAccountId(s) || isContractId(s);
}

export function addressKind(s: string): "G" | "C" | null {
  if (isAccountId(s)) return "G";
  if (isContractId(s)) return "C";
  return null;
}
