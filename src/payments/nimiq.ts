import { init } from '@nimiq/mini-app-sdk';

const LUNA_PER_NIM = 100_000n;
const buildFundingAddress = import.meta.env.VITE_NIMIQ_FUNDING_ADDRESS?.trim() ?? '';

function normalizeAddress(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

async function resolveFundingRecipient(inputRecipient: string): Promise<string> {
  const recipient = inputRecipient.trim();
  if (!recipient) return '';

  // If this call is using the build-time funding address, refresh it from the
  // server at runtime. This keeps the Mini App aligned with the same address
  // that the backend will verify, even if Nimiq Pay is holding an older bundle.
  if (buildFundingAddress && normalizeAddress(recipient) === normalizeAddress(buildFundingAddress)) {
    try {
      const response = await fetch('/api/metrics', { credentials: 'same-origin' });
      if (response.ok) {
        const payload = await response.json();
        const runtimeFundingAddress = String(payload?.publicConfig?.fundingAddress || '').trim();
        if (runtimeFundingAddress) return runtimeFundingAddress;
      }
    } catch {
      // Fall back to the build-time value below.
    }
  }

  return recipient;
}

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
  const recipient = await resolveFundingRecipient(input.recipient);
  if (!recipient) {
    throw new Error('A Nimiq funding recipient must be configured before funding.');
  }

  const provider = await init({ timeout: 10_000 });
  const result = await provider.sendBasicTransaction({
    recipient,
    value: nimToLuna(input.amountNim),
  });

  if (typeof result !== 'string') {
    throw new Error('Nimiq Pay did not return a transaction hash.');
  }

  return result;
}
