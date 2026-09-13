export type FundingInput = {
  bountyId: string;
  amount: string;
  asset: string;
};

export type FundingResult = {
  reference: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
};

export type PayoutInput = {
  bountyId: string;
  recipient: string;
  amount: string;
  asset: string;
  idempotencyKey: string;
};

export type PayoutResult = {
  reference: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
};

export type TransactionStatus = {
  reference: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
};

export interface PaymentProvider {
  createFundingIntent(input: FundingInput): Promise<FundingResult>;
  verifyFunding(reference: string): Promise<TransactionStatus>;
  releasePayout(input: PayoutInput): Promise<PayoutResult>;
  getTransaction(reference: string): Promise<TransactionStatus>;
}
