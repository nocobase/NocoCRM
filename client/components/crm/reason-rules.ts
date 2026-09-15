import type { Entity } from './api.js';

export interface ReasonField {
  key: string;
  type: 'select' | 'textarea' | 'date';
  required: boolean;
}

// Statuses that must carry a reason, and which fields collect it. Mirrors the
// server's rules: a lead going invalid, an account churning, an opportunity
// lost or paused. A status not listed here changes in one write.
export function reasonFor(
  entity: Entity,
  stage: string,
): ReasonField[] | undefined {
  if (entity === 'leads' && stage === 'invalid')
    return [{ key: 'invalidReason', type: 'select', required: true }];
  if (entity === 'accounts' && stage === 'churned')
    return [{ key: 'churnReason', type: 'select', required: true }];
  if (entity === 'opportunities' && stage === 'lost')
    return [{ key: 'lostReason', type: 'select', required: true }];
  if (entity === 'opportunities' && stage === 'paused')
    return [
      { key: 'pauseReason', type: 'select', required: true },
      { key: 'resumeAt', type: 'date', required: false },
    ];
  return undefined;
}
