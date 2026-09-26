/** How a paid order's payment should be described to the customer. */
export type OrderPaymentKind = 'test' | 'card' | 'no-charge' | 'unknown';

type TransactionLike = {
  paymentId?: string | null;
  token?: string | null;
  lastFourDigits?: string | null;
} | null | undefined;

const isSimulatorTransaction = (tx: NonNullable<TransactionLike>) =>
  Boolean(tx.paymentId?.startsWith('MOCK_PAY_') || tx.token?.startsWith('MOCK_IYZICO_'));

export function describeOrderPayment(totalAmount: number | null, tx: TransactionLike): OrderPaymentKind {
  if (tx && isSimulatorTransaction(tx)) return 'test';
  if (tx?.paymentId) return 'card';
  if (totalAmount === 0) return 'no-charge';
  return 'unknown';
}
