import { beforeEach, describe, expect, it } from 'vitest';
import { createSampleBackend } from './sampleBackend';
import { AllocationError } from './types';

const input = {
  title: 'Test',
  description: 'A test event',
  category: 'hackathon',
  startDate: '2026-12-01',
  endDate: '2026-12-01',
  dailyStart: '09:00',
  dailyEnd: '17:00',
  venue: 'Hall',
  city: 'Pune',
  expectedAttendees: 10,
  theme: 'indigo',
  requirements: [],
};

describe('sampleBackend', () => {
  beforeEach(() => localStorage.clear());

  it('creates events visible only to their members', async () => {
    const b = createSampleBackend(0);
    await b.createEvent('u1', input);
    const forU1 = await new Promise((res) => b.subscribeEvents('u1', (e) => res(e.length)));
    const forU2 = await new Promise((res) => b.subscribeEvents('u2', (e) => res(e.length)));
    expect(forU1).toBe(1);
    expect(forU2).toBe(0);
  });

  it('never over-allocates the last slot, even with concurrent claims', async () => {
    const b = createSampleBackend(0);
    const id = await b.createEvent('u1', input);
    const rid = await b.addSub(id, 'resources', { name: 'Volunteers', category: 'people', unit: 'people', required: 2, allocated: 1 });

    const results = await Promise.allSettled([b.claimResource(id, rid, 'A', 1), b.claimResource(id, rid, 'B', 1)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected.reason).toBeInstanceOf(AllocationError);

    const res = await new Promise((r) => b.subscribeSub(id, 'resources', r));
    expect(res[0].allocated).toBe(2);
  });

  it('releasing an allocation frees the slot', async () => {
    const b = createSampleBackend(0);
    const id = await b.createEvent('u1', input);
    const rid = await b.addSub(id, 'resources', { name: 'Judges', category: 'people', unit: 'people', required: 1, allocated: 0 });
    await b.claimResource(id, rid, 'Judge Judy', 1);
    const [alloc] = await new Promise((r) => b.subscribeSub(id, 'allocations', r));
    await b.releaseAllocation(id, alloc);
    const res = await new Promise((r) => b.subscribeSub(id, 'resources', r));
    expect(res[0].allocated).toBe(0);
  });

  it('deleting an event removes its sub-collections', async () => {
    const b = createSampleBackend(0);
    const id = await b.createEvent('u1', input);
    await b.addSub(id, 'tasks', { title: 't', description: '', status: 'todo', priority: 'low', assigneeId: null, dueDate: null, order: 0, createdAt: 1 });
    await b.deleteEvent(id);
    const tasks = await new Promise((r) => b.subscribeSub(id, 'tasks', r));
    expect(tasks).toHaveLength(0);
  });

  it('supports inviting, auto-joining, transferring admin and leaving', async () => {
    const b = createSampleBackend(0);
    const id = await b.createEvent('admin', input, { name: 'Admin', email: 'admin@x.com' });
    await b.inviteOrganizer(id, 'Friend@X.com');
    const invited = await new Promise((r) => b.subscribeInvites('friend@x.com', r));
    expect(invited.map((e) => e.id)).toEqual([id]);

    await b.acceptInvite(id, { uid: 'friend', email: 'friend@x.com', name: 'Friend' });
    let ev = await new Promise((r) => b.subscribeEvent(id, r));
    expect(ev.memberIds).toEqual(['admin', 'friend']);
    expect(ev.invites).toEqual([]);
    expect(ev.members?.friend?.name).toBe('Friend');
    const friendEvents = await new Promise((r) => b.subscribeEvents('friend', (e) => r(e.length)));
    expect(friendEvents).toBe(1);

    await expect(b.acceptInvite(id, { uid: 'stranger', email: 'stranger@x.com', name: 'S' })).rejects.toThrow();
    await expect(b.transferOwnership(id, 'stranger')).rejects.toThrow();

    await b.transferOwnership(id, 'friend');
    ev = await new Promise((r) => b.subscribeEvent(id, r));
    expect(ev.ownerId).toBe('friend');

    await expect(b.removeMember(id, 'friend')).rejects.toThrow(/admin/);
    await b.removeMember(id, 'admin');
    ev = await new Promise((r) => b.subscribeEvent(id, r));
    expect(ev.memberIds).toEqual(['friend']);
  });
});
