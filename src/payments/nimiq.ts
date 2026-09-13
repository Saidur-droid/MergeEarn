import { init } from '@nimiq/mini-app-sdk';

const LUNA_PER_NIM = 100_000n;

export function nimToLuna(value: string): number {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,5})?$/.test(normalized)) {
    throw new Error('NIM amount must be a positive number with up to 5 decimal places.');
  }

  const [wholePart, decimalPart = ''] = normalized.split('.');
  const whole = BigInt(wholePart);
  const fraction = BigInt(decimalPart.padEnd(5, '0'));
  const luna = whole * LUNA_PER_NIM + fraction;

  if (luna <= 0n) {
    throw new Error('NIM amount must be greater than zero.');
  }
  if (luna > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('NIM amount is too large.');
  }

  return Number(luna);
}

export async function sendNimFundingPayment(input: {
  recipient: string;
  amountNim: string;
}): Promise<string> {
  const recipient = input.recipient.trim();
  if (!recipient) {
    throw new Error('A Nimiq funding recipient must be configured before funding.');
  }

  const provider = await init({ timeout: 10_000 });
  const consensus = await provider.isConsensusEstablished();
  if (!consensus) {
    throw new Error('Nimiq network consensus is not established yet. Try again shortly.');
  }

  const result = await provider.sendBasicTransaction({
    recipient,
    value: nimToLuna(input.amountNim),
  });

  if (typeof result !== 'string') {
    throw new Error('Nimiq Pay did not return a transaction hash.');
  }

  return result;
}
