import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createJobExecutorService } from '@nocobase/jobs';
import { describe, expect, it } from 'vitest';
import {
  createFollowUpJob,
  FOLLOW_UP_JOBS,
  type FollowUpPayload,
} from '../../server/providers/crm/follow-up-jobs.js';

describe('AI follow-ups as tasks of the jobs service', () => {
  it('runs each queued follow-up, two at a time, and keeps one queued across a restart', async () => {
    const folder = await mkdtemp(resolve(tmpdir(), 'crm-jobs-'));
    const config = {
      [FOLLOW_UP_JOBS]: {
        adapter: 'memory' as const,
        concurrency: 2,
        attempts: 1,
        persistence: { path: folder },
      },
    };
    try {
      let running = 0;
      let most = 0;
      const ran: string[] = [];
      let release!: () => void;
      const gate = new Promise<void>((done) => (release = done));
      const FollowUpJob = createFollowUpJob(async (payload) => {
        running += 1;
        most = Math.max(most, running);
        await gate;
        ran.push(payload.entryId);
        running -= 1;
      });
      const service = createJobExecutorService(config, {
        appName: 'crm-test',
        storagePath: folder,
      });
      const executor = service.getJobExecutor('crm', FOLLOW_UP_JOBS);
      executor.registerJob(FollowUpJob);
      await executor.setup();
      const payload = (entryId: string): FollowUpPayload => ({
        entity: 'leads',
        entryId,
        language: null,
      });
      for (const id of ['a', 'b', 'c'])
        await executor.addJob(new FollowUpJob(payload(id)));
      await new Promise((done) => setTimeout(done, 50));
      // Two at a time, whatever is queued.
      expect(running).toBe(2);
      release();
      await new Promise((done) => setTimeout(done, 50));
      expect(ran.sort()).toEqual(['a', 'b', 'c']);
      expect(most).toBe(2);
      await service.shutdown();

      // Queued before a shutdown that never ran it: run at the next start.
      const stalled = createJobExecutorService(config, {
        appName: 'crm-test',
        storagePath: folder,
      });
      const paused = stalled.getJobExecutor('crm', FOLLOW_UP_JOBS);
      const Blocked = createFollowUpJob(
        () => new Promise<void>(() => undefined),
      );
      paused.registerJob(Blocked);
      await paused.setup({ consume: false });
      await paused.addJob(new Blocked(payload('later')));
      await stalled.shutdown();
      const later: string[] = [];
      const restarted = createJobExecutorService(config, {
        appName: 'crm-test',
        storagePath: folder,
      });
      const resumed = restarted.getJobExecutor('crm', FOLLOW_UP_JOBS);
      resumed.registerJob(
        createFollowUpJob(async (p) => {
          later.push(p.entryId);
        }),
      );
      await resumed.setup();
      await new Promise((done) => setTimeout(done, 50));
      expect(later).toEqual(['later']);
      await restarted.shutdown();
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});
