import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertRepoMaintainer, encryptSecret, getSession, verifyNimiqTransaction } from './server.js';

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
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SESSION_ENCRYPTION_KEY;
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

  it('rejects a confirmed transaction with the wrong amount', async () => {
    process.env.NIMIQ_RPC_URL = 'https://rpc.test.invalid';
    mockRpcTransaction({ value: 499_999 });

    const result = await verifyNimiqTransaction({
      hash: 'wrong-amount',
      expectedRecipient: FUNDING_ADDRESS,
      expectedAmountLuna: 500_000,
    });

    expect(result.confirmed).toBe(false);
    expect(result.rejected).toBe(true);
    expect(result.reason).toBe('Transaction amount does not match the bounty amount.');
  });

  it('rejects a payout from the wrong sender', async () => {
    process.env.NIMIQ_RPC_URL = 'https://rpc.test.invalid';
    mockRpcTransaction({ from: 'NQ00 0000 0000 0000 0000 0000 0000 0000 0000' });

    const result = await verifyNimiqTransaction({
      hash: 'wrong-sender',
      expectedRecipient: FUNDING_ADDRESS,
      expectedAmountLuna: 500_000,
      expectedSender: 'NQ48 P4KM 6PUB GNRM 1VQ9 HLTH L5UV CDK5 BYKF',
    });

    expect(result.confirmed).toBe(false);
    expect(result.rejected).toBe(true);
    expect(result.reason).toBe('Transaction sender does not match the expected payout wallet.');
  });

  it('does not confirm a transaction before block inclusion', async () => {
    process.env.NIMIQ_RPC_URL = 'https://rpc.test.invalid';
    mockRpcTransaction({ blockNumber: null });

    const result = await verifyNimiqTransaction({
      hash: 'pending',
      expectedRecipient: FUNDING_ADDRESS,
      expectedAmountLuna: 500_000,
    });

    expect(result.confirmed).toBe(false);
    expect(result.rejected).toBeUndefined();
    expect(result.reason).toBe('Transaction is pending confirmation.');
  });
});


describe('session encryption rotation', () => {
  it('invalidates a stale encrypted GitHub token instead of throwing after key rotation', async () => {
    process.env.SUPABASE_URL = 'https://db.test.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
    process.env.SESSION_ENCRYPTION_KEY = 'old-session-key-for-test';
    const ciphertext = encryptSecret('github-token');

    process.env.SESSION_ENCRYPTION_KEY = 'new-session-key-for-test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify([{
          id: 'session-1',
          user_id: 'user-1',
          github_access_token_ciphertext: ciphertext,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          users: { id: 'user-1', github_user_id: 1, github_login: 'tester', avatar_url: null },
        }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });
    vi.stubGlobal('fetch', fetchMock);

    const session = await getSession({ headers: { cookie: 'mergeearn_session=test-token' } });

    expect(session).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('/rest/v1/sessions');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
  });
});

describe('repository authorization', () => {
  it('rejects an authenticated GitHub user without maintainer permission', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ permissions: { pull: true, push: false, maintain: false, admin: false } }),
      headers: new Headers(),
    })));

    await expect(assertRepoMaintainer('token', 'acme', 'project')).rejects.toMatchObject({
      message: 'Maintainer or push permission is required for this repository.',
      statusCode: 403,
    });
  });
});
