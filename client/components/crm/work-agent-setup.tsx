import { useState, type ReactElement } from 'react';
import { Button } from '../ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.js';
import { Field, FieldDescription, FieldLabel } from '../ui/field.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select.js';
import { Textarea } from '../ui/textarea.js';
import {
  toText,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useRefresh,
} from './api.js';
import { ErrorNotice, Loading } from './common.js';
import { modelKey, useChatModelChoices } from './agent-chat/ask.js';

// How a work agent is set up (server/providers/crm-agents/work-agents.ts),
// changed by whoever manages the settings on the Agent work page: the model
// its work asks (the default, DeepSeek's fast one, until one is chosen) and
// the instructions every run opens with (the shipped ones until written
// over, Restore the default going back to them).

type ModelRef = { modelService: string; model: string };
interface Setup {
  model: ModelRef | null;
  effectiveModel: ModelRef | null;
  instructions: string;
  defaultInstructions: string;
  custom: boolean;
}

// The default model's value in the select.
const DEFAULT = '';

export function WorkAgentSetup({
  agent,
  name,
  onClose,
}: {
  agent: string;
  name: string;
  onClose: () => void;
}): ReactElement {
  const { text } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const query = useCrmQuery<Setup>(`aiAgents/${agent}/setup`);
  const models = useChatModelChoices();
  const [model, setModel] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>();
  const setup = query.data;
  const chosen = model ?? (setup?.model ? modelKey(setup.model) : DEFAULT);
  const written = instructions ?? setup?.instructions ?? '';
  const save = async (): Promise<void> => {
    if (!setup) return;
    setSaving(true);
    setError(undefined);
    try {
      const picked = models.find((choice) => modelKey(choice) === chosen);
      await api(`aiAgents/${agent}/setup`, 'PUT', {
        model: picked
          ? { modelService: picked.modelService, model: picked.model }
          : null,
        instructions:
          written.trim() === setup.defaultInstructions.trim() ? null : written,
      });
      await refresh();
      onClose();
    } catch (cause) {
      setError(cause);
    } finally {
      setSaving(false);
    }
  };
  const effective = setup?.effectiveModel
    ? models.find(
        (choice) => modelKey(choice) === modelKey(setup.effectiveModel!),
      )
    : undefined;
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{text('agents.setup.title', { name })}</DialogTitle>
          <DialogDescription>
            {text('agents.setup.description')}
          </DialogDescription>
        </DialogHeader>
        {!setup ? (
          query.error ? (
            <ErrorNotice error={query.error} />
          ) : (
            <Loading />
          )
        ) : (
          <div className='grid gap-5'>
            <ErrorNotice error={error} />
            <Field>
              <FieldLabel>{text('agents.setup.model')}</FieldLabel>
              <Select
                value={chosen}
                onValueChange={(next) => {
                  if (typeof next === 'string') setModel(next);
                }}
              >
                <SelectTrigger aria-label={toText(text('agents.setup.model'))}>
                  <SelectValue>
                    {chosen === DEFAULT
                      ? text('agents.setup.defaultModel', {
                          model: effective
                            ? `${effective.serviceTitle} · ${effective.modelLabel}`
                            : '—',
                        })
                      : (() => {
                          const picked = models.find(
                            (choice) => modelKey(choice) === chosen,
                          );
                          return picked
                            ? `${picked.serviceTitle} · ${picked.modelLabel}`
                            : chosen;
                        })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT}>
                    {text('agents.setup.defaultModel', {
                      model:
                        effective && !setup.model
                          ? `${effective.serviceTitle} · ${effective.modelLabel}`
                          : '—',
                    })}
                  </SelectItem>
                  {models.map((choice) => (
                    <SelectItem key={modelKey(choice)} value={modelKey(choice)}>
                      {choice.serviceTitle} · {choice.modelLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {text(
                  agent === 'signals'
                    ? 'agents.setup.modelHintSignals'
                    : 'agents.setup.modelHint',
                )}
              </FieldDescription>
            </Field>
            <Field>
              <div className='flex items-center justify-between gap-2'>
                <FieldLabel>{text('agents.setup.instructions')}</FieldLabel>
                <Button
                  variant='ghost'
                  size='xs'
                  disabled={written.trim() === setup.defaultInstructions.trim()}
                  onClick={() => setInstructions(setup.defaultInstructions)}
                >
                  {text('agents.setup.restore')}
                </Button>
              </div>
              <Textarea
                value={written}
                onChange={(event) => setInstructions(event.target.value)}
                className='max-h-[40svh] min-h-48 font-mono text-xs'
              />
              <FieldDescription>
                {text('agents.setup.instructionsHint')}
              </FieldDescription>
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant='outline' disabled={saving} onClick={onClose}>
            {text('cancel')}
          </Button>
          <Button disabled={!setup || saving} onClick={() => void save()}>
            {saving ? text('saving') : text('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
