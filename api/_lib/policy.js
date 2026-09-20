export function normalizeRepositoryName(value) {
  return String(value || '').trim().toLowerCase();
}

export function assertExpectedPullRequest(pr, expectedRepositoryFullName, expectedBaseBranch) {
  const canonicalRepository = pr?.base?.repo?.full_name;
  if (!canonicalRepository || normalizeRepositoryName(canonicalRepository) !== normalizeRepositoryName(expectedRepositoryFullName)) {
    const error = new Error(`Pull request must target ${expectedRepositoryFullName}.`);
    error.statusCode = 400;
    throw error;
  }
  if (pr?.base?.ref !== expectedBaseBranch) {
    const error = new Error(`Pull request must target ${expectedBaseBranch}.`);
    error.statusCode = 400;
    throw error;
  }
  if (!pr?.id || !pr?.number || !pr?.head?.sha) {
    const error = new Error('GitHub returned incomplete pull request metadata.');
    error.statusCode = 502;
    throw error;
  }
  return true;
}

export function canReplacePaymentReference(transaction, nextReference) {
  if (!transaction) return true;
  if (transaction.status === 'CONFIRMED') return false;
  if (transaction.status === 'FAILED') return true;
  if (!transaction.provider_reference) return true;
  return transaction.provider_reference === nextReference;
}

export function isPayoutEligible(status) {
  return status === 'APPROVED' || status === 'PAYMENT_FAILED';
}

export function pullRequestVerificationStatus(pr) {
  return pr?.merged === true ? 'VERIFIED' : 'PENDING';
}
