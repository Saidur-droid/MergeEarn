import { handleError, json, method, readJson, requireSession } from './_lib/server.js';

function fallbackDraft(input) {
  const title = String(input.title || 'Untitled issue').trim();
  const body = String(input.body || '').trim();
  const firstParagraph = body.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean);
  const summary = firstParagraph || `Resolve the GitHub issue: ${title}.`;
  const criteria = [
    'Implement the requested change without breaking existing behavior.',
    'Add or update tests for the changed behavior.',
    'Open a pull request against the repository default branch and ensure required checks pass.',
  ];
  return {
    title,
    summary: summary.slice(0, 1200),
    acceptanceCriteria: criteria,
    difficulty: 'medium',
    estimatedEffort: 'Review the issue scope and repository before committing to an estimate.',
    suggestedReward: { min: 5, max: 25, asset: 'NIM' },
    risks: body ? [] : ['The source issue has little or no description; clarify scope before funding.'],
    source: 'fallback',
  };
}

function validDraft(value) {
  return value && typeof value.title === 'string' && typeof value.summary === 'string'
    && Array.isArray(value.acceptanceCriteria) && value.acceptanceCriteria.every((item) => typeof item === 'string')
    && ['easy', 'medium', 'hard'].includes(value.difficulty)
    && Array.isArray(value.risks);
}

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    await requireSession(req);
    const input = await readJson(req);
    const fallback = fallbackDraft(input);
    const endpoint = process.env.AI_API_URL?.trim();
    const key = process.env.AI_API_KEY?.trim();
    const model = process.env.AI_MODEL?.trim();
    if (!endpoint || !key || !model) return json(res, 200, { draft: fallback, degraded: true });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You convert GitHub issues into concise editable bounty specifications. Return JSON only with title, summary, acceptanceCriteria (string[]), difficulty (easy|medium|hard), estimatedEffort (string), suggestedReward ({min,max,asset:"NIM"}), and risks (string[]). Never decide payment eligibility.',
          },
          { role: 'user', content: JSON.stringify({ title: input.title, body: input.body, repository: input.repository }) },
        ],
      }),
    });
    const payload = await response.json();
    if (!response.ok) return json(res, 200, { draft: fallback, degraded: true });
    let parsed;
    try { parsed = JSON.parse(payload.choices?.[0]?.message?.content || ''); } catch { parsed = null; }
    if (!validDraft(parsed)) return json(res, 200, { draft: fallback, degraded: true });
    json(res, 200, { draft: { ...parsed, source: 'ai' }, degraded: false });
  } catch (error) {
    handleError(res, error);
  }
}
