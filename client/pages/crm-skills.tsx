import { useState, type ReactElement } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PageContainer } from '../components/page-container.js';
import { PageHeader } from '../components/page-header.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Textarea } from '../components/ui/textarea.js';
import { ErrorNotice, Loading } from '../components/crm/common.js';
import { LengthHint } from '../components/crm/length-hint.js';
import { Markdown } from '../components/crm/markdown.js';
import {
  localDate,
  useCrmApi,
  useCrmQuery,
  useCrmText,
  useMetadata,
  useRefresh,
} from '../components/crm/api.js';
import { LONG_TEXT_LIMIT } from '../../server/providers/crm/limits.js';

interface CrmSkill {
  name: string;
  title: string;
  description: string;
  content: string;
  notes: string;
  updatedAt: string | null;
  updatedByName: string | null;
}
interface SkillList {
  skills: CrmSkill[];
  canEdit: boolean;
}

// The CRM's AI skills (ai/skills) and the company's additions to them, on
// the main menu so everyone can see how the AI works. The built-in method is
// read-only: it ships with the source. The additions are edited by whoever
// holds the sales capability manageSkills, stored by the server and appended
// to the skill the AI loads (server/providers/crm/skills.ts).
export default function SkillsPage(): ReactElement {
  const { text } = useCrmText();
  const query = useCrmQuery<SkillList>('skills');
  return (
    <PageContainer>
      <PageHeader
        title={text('skillsPage.title')}
        description={text('skillsPage.description')}
      />
      {query.isLoading ? (
        <Loading />
      ) : !query.data ? (
        <ErrorNotice error={query.error} />
      ) : query.data.skills.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          {text('skillsPage.empty')}
        </p>
      ) : (
        <div className='grid gap-4'>
          {query.data.skills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              canEdit={query.data.canEdit}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function SkillCard({
  skill,
  canEdit,
}: {
  skill: CrmSkill;
  canEdit: boolean;
}): ReactElement {
  const { text, language } = useCrmText();
  const api = useCrmApi();
  const refresh = useRefresh();
  const timeZone = useMetadata().data?.settings.timeZone ?? 'Asia/Shanghai';
  const [showMethod, setShowMethod] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(skill.notes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);

  const save = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await api(`skills/${skill.name}`, 'PUT', { notes: draft });
      await refresh();
      setEditing(false);
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <CardTitle>{skill.title}</CardTitle>
          <Badge variant='muted'>{text('skillsPage.builtIn')}</Badge>
        </div>
        <CardDescription>{skill.description}</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4'>
        <div>
          <Button
            variant='ghost'
            size='sm'
            className='-ml-2'
            aria-expanded={showMethod}
            onClick={() => setShowMethod((v) => !v)}
          >
            {showMethod ? <ChevronDown /> : <ChevronRight />}
            {text(
              showMethod ? 'skillsPage.hideMethod' : 'skillsPage.showMethod',
            )}
          </Button>
          {showMethod && (
            <div className='mt-2 rounded-lg border bg-muted/30 p-4'>
              <Markdown>{skill.content}</Markdown>
            </div>
          )}
        </div>
        <section className='grid gap-2 border-t pt-4'>
          <div className='flex items-center justify-between gap-2'>
            <h3 className='text-sm font-medium'>{text('skillsPage.notes')}</h3>
            {canEdit && !editing && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setDraft(skill.notes);
                  setSaved(false);
                  setEditing(true);
                }}
              >
                {text(skill.notes ? 'edit' : 'skillsPage.addNotes')}
              </Button>
            )}
          </div>
          <p className='text-xs text-muted-foreground'>
            {text('skillsPage.notesHint')}
          </p>
          {editing ? (
            <div className='grid gap-2'>
              <Textarea
                value={draft}
                maxLength={LONG_TEXT_LIMIT}
                rows={6}
                placeholder={text('skillsPage.placeholder')}
                aria-label={text('skillsPage.notes')}
                onChange={(e) => setDraft(e.target.value)}
              />
              <LengthHint length={draft.length} language={language} />
              <ErrorNotice error={error} />
              <div className='flex gap-2'>
                <Button disabled={busy} onClick={() => void save()}>
                  {text('save')}
                </Button>
                <Button
                  variant='outline'
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  {text('cancel')}
                </Button>
              </div>
            </div>
          ) : skill.notes ? (
            <Markdown compact>{skill.notes}</Markdown>
          ) : (
            <p className='text-sm text-muted-foreground'>
              {text('skillsPage.noNotes')}
            </p>
          )}
          {saved && !editing && (
            <p role='status' className='text-sm text-muted-foreground'>
              {text('skillsPage.saved')}
            </p>
          )}
          {skill.notes &&
            skill.updatedAt &&
            skill.updatedByName &&
            !editing && (
              <p className='text-xs text-muted-foreground'>
                {text('skillsPage.updated', {
                  name: skill.updatedByName,
                  date: localDate(skill.updatedAt, language, timeZone),
                })}
              </p>
            )}
        </section>
      </CardContent>
    </Card>
  );
}
