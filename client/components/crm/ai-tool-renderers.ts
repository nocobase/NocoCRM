import type { AIToolRendererMap } from '@/extensions/nocobase-ai';
import { CrmWriteCard } from './ai-tool-cards.js';

const writeTools = [
  'create_record',
  'update_record',
  'delete_record',
  'convert_lead',
  'approval_action',
];

// The CRM's write tools, each rendered by the confirmation card: standalone
// so the values and the decision sit together, handling the approval itself.
export const crmToolRenderers: AIToolRendererMap = Object.fromEntries(
  writeTools.map((name) => [
    name,
    { component: CrmWriteCard, handlesApproval: true, standalone: true },
  ]),
);
