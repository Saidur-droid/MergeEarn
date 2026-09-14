import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{30,}/g],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{50,}/g],
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/g],
  ['Supabase secret key', /sb_secret_[A-Za-z0-9._-]{20,}/g],
  ['OpenAI-style API key', /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g],
  ['AWS access key', /AKIA[0-9A-Z]{16}/g],
  ['Private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  [
    'Sensitive environment assignment',
    /(?:SUPABASE_SERVICE_ROLE_KEY|GITHUB_CLIENT_SECRET|AI_API_KEY|SESSION_ENCRYPTION_KEY|NIMIQ_PRIVATE_KEY|SEED_PHRASE)\s*=\s*["']?[^\s"'#<>]{20,}/g,
  ],
  ['JWT-like credential', /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g],
];

const ignoredPaths = new Set([
  'package-lock.json',
]);

function scanText(scope, text) {
  const findings = [];
  for (const [label, regex] of patterns) {
    regex.lastIndex = 0;
    if (regex.test(text)) findings.push(label);
  }
  return findings.map((label) => `${scope}: ${label}`);
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

const findings = [];

let trackedFiles = [];
try {
  trackedFiles = git(['ls-files', '-z']).split('\0').filter(Boolean);
} catch (error) {
  console.error('Secret scan could not enumerate tracked files.');
  process.exit(2);
}

for (const path of trackedFiles) {
  if (ignoredPaths.has(path)) continue;
  try {
    const content = readFileSync(path, 'utf8');
    findings.push(...scanText(`worktree:${path}`, content));
  } catch {
    // Binary/non-text tracked files are intentionally skipped.
  }
}

try {
  const history = git([
    'log',
    '--all',
    '--no-ext-diff',
    '--no-color',
    '--pretty=format:COMMIT:%H',
    '-p',
    '--',
    '.',
  ]);
  findings.push(...scanText('git-history', history));
} catch (error) {
  console.error('Secret scan could not inspect git history. Ensure CI checkout uses fetch-depth: 0.');
  process.exit(2);
}

const uniqueFindings = [...new Set(findings)];
if (uniqueFindings.length) {
  console.error('Potential secret material detected. Values are intentionally not printed.');
  for (const finding of uniqueFindings) console.error(`- ${finding}`);
  console.error('Rotate any real credential before removing or rewriting it. Do not merely delete the current file.');
  process.exit(1);
}

console.log(`Secret scan passed: ${trackedFiles.length} tracked files plus available git history.`);
