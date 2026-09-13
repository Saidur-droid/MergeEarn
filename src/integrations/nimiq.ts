import { init } from '@nimiq/mini-app-sdk';

export type NimiqWalletSnapshot = {
  address: string;
  consensusEstablished: boolean;
  blockNumber: number;
};

let providerPromise: ReturnType<typeof init> | null = null;

function getProvider() {
  providerPromise ??= init();
  return providerPromise;
}

export async function connectNimiqWallet(): Promise<NimiqWalletSnapshot> {
  const provider = await getProvider();

  const [accountsResult, consensusEstablished, blockNumber] = await Promise.all([
    provider.listAccounts(),
    provider.isConsensusEstablished(),
    provider.getBlockNumber(),
  ]);

  if (!Array.isArray(accountsResult)) {
    throw new Error('Nimiq Pay could not return wallet accounts.');
  }

  const address = accountsResult[0];
  if (!address) {
    throw new Error('No Nimiq account is available in Nimiq Pay.');
  }

  return {
    address,
    consensusEstablished,
    blockNumber,
  };
}

export function shortNimiqAddress(address: string): string {
  if (address.length <= 18) return address;
  return `${address.slice(0, 10)}…${address.slice(-6)}`;
}
