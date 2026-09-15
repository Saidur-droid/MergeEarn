import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyNimiqTransaction } from './server.js';

const FUNDING_ADDRESS = 'NQ80 F58K 8EKP SN7A L3GB R4SX J85K EC03 8P5Y';

function mockRpcTransaction(overrides = {}) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      jsonrpc: '2.0',
      id: 'test',
      result: {
        data: {
          from: 'NQ48 P4KM 6PUB GNRM 1VQ9 HLTH L5UV CDK5 BYKF',
          to: FUNDING_ADDRESS,
          value: 500_000,
          blockNumber: 11_496_956,
          executionResult: true,
          ...overrides,
        },
        metadata: { source: 'testnet' },
      },
    }),
  })));
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NIMIQ_RPC_URL;
});

describe('verifyNimiqTransaction', () => {
  it('unwraps Nimiq PoS RPC data and confirms the expected funding payment', async () => {
    process.env.NIMIQ_RPC_URL = 'https://rpc.test.invalid';
    mockRpcTransaction();

    const result = await verifyNimiqTransaction({
      hash: 'e0aecb2d9afeaa219171b5bebb9e53b438fd4031f34c6dbb91d9bd954a596345',
      expectedRecipient: FUNDING_ADDRESS,
      expectedAmountLuna: 500_000,
    });

    expect(result.confirmed).toBe(true);
    expect(result.result.to).toBe(FUNDING_ADDRESS);
    expect(result.result.value).toBe(500_000);
  });

  it('rejects a confirmed transaction sent to a different recipient', async () => {
    process.env.NIMIQ_RPC_URL = 'https://rpc.test.invalid';
    mockRpcTransaction({ to: 'NQ00 0000 0000 0000 0000 0000 0000 0000 0000' });

    const result = await verifyNimiqTransaction({
      hash: 'different-recipient',
      expectedRecipient: FUNDING_ADDRESS,
      expectedAmountLuna: 500_000,
    });

    expect(result.confirmed).toBe(false);
    expect(result.rejected).toBe(true);
    expect(result.reason).toBe('Transaction recipient does not match the bounty payment address.');
  });
});
