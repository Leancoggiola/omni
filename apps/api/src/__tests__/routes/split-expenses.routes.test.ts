import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { createTestApp } from '../../test/createTestApp';
import { AUTH_HEADER, TEST_USER } from '../../test/constants';
import { paginatedEmpty, splitFriend } from '../../test/fixtures/lifestyle';
import * as splitService from '../../split-expenses/split-expenses.service';

vi.mock('../../split-expenses/split-expenses.service');

const mockedSplit = vi.mocked(splitService);

const gatheringDetail = {
  id: 'gathering-1',
  name: 'Asado',
  date: '2026-08-10',
  isSettled: false,
  settledAt: null,
  participantCount: 2,
  totalAmount: 10000,
  fairShare: 5000,
  participants: [],
  expenses: [],
  settlements: [],
};

describe('split-expenses routes', () => {
  const app = createTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedSplit.listFriends.mockResolvedValue([splitFriend]);
    mockedSplit.suggestFriends.mockResolvedValue([{ id: splitFriend.id, name: splitFriend.name, alias: null }]);
    mockedSplit.createFriend.mockResolvedValue(splitFriend);
    mockedSplit.updateFriend.mockResolvedValue(splitFriend);
    mockedSplit.deleteFriend.mockResolvedValue(undefined);
    mockedSplit.listGatherings.mockResolvedValue(paginatedEmpty);
    mockedSplit.getGathering.mockResolvedValue(gatheringDetail);
    mockedSplit.createGathering.mockResolvedValue(gatheringDetail);
    mockedSplit.toggleGatheringSettled.mockResolvedValue({ ...gatheringDetail, isSettled: true });
    mockedSplit.deleteGathering.mockResolvedValue(undefined);
    mockedSplit.addGatheringExpense.mockResolvedValue(gatheringDetail);
    mockedSplit.deleteGatheringExpense.mockResolvedValue(undefined);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/split-expenses/friends');
    expect(res.status).toBe(401);
  });

  it('GET /friends lists friends', async () => {
    const res = await request(app).get('/api/split-expenses/friends').set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([splitFriend]);
    expect(mockedSplit.listFriends).toHaveBeenCalledWith(TEST_USER.userId);
  });

  it('GET /friends/suggest requires q', async () => {
    const res = await request(app).get('/api/split-expenses/friends/suggest').set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(400);
  });

  it('POST /friends creates friend', async () => {
    const res = await request(app)
      .post('/api/split-expenses/friends')
      .set('Authorization', AUTH_HEADER)
      .send({ name: 'Ana', alias: 'ana123' });
    expect(res.status).toBe(201);
    expect(mockedSplit.createFriend).toHaveBeenCalledWith(TEST_USER.userId, { name: 'Ana', alias: 'ana123' });
  });

  it('DELETE /friends/:id returns 204', async () => {
    const res = await request(app).delete('/api/split-expenses/friends/friend-1').set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(204);
    expect(mockedSplit.deleteFriend).toHaveBeenCalledWith(TEST_USER.userId, 'friend-1');
  });

  it('GET /gatherings returns paginated list', async () => {
    const res = await request(app).get('/api/split-expenses/gatherings').set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(mockedSplit.listGatherings).toHaveBeenCalledWith(TEST_USER.userId, expect.any(Object));
  });

  it('GET /gatherings/:id returns detail', async () => {
    const res = await request(app).get('/api/split-expenses/gatherings/gathering-1').set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(gatheringDetail);
  });

  it('POST /gatherings creates gathering', async () => {
    const payload = {
      name: 'Asado',
      date: '2026-08-10',
      participants: [{ name: 'Ana' }, { name: 'Bob' }],
    };
    const res = await request(app)
      .post('/api/split-expenses/gatherings')
      .set('Authorization', AUTH_HEADER)
      .send(payload);
    expect(res.status).toBe(201);
    expect(mockedSplit.createGathering).toHaveBeenCalledWith(TEST_USER.userId, payload);
  });

  it('PATCH /gatherings/:id/settled toggles settled', async () => {
    const res = await request(app)
      .patch('/api/split-expenses/gatherings/gathering-1/settled')
      .set('Authorization', AUTH_HEADER)
      .send({ isSettled: true });
    expect(res.status).toBe(200);
    expect(mockedSplit.toggleGatheringSettled).toHaveBeenCalledWith(TEST_USER.userId, 'gathering-1', {
      isSettled: true,
    });
  });

  it('POST /gatherings/:id/expenses adds expense', async () => {
    const payload = { participantId: 'p-1', amount: 5000, description: 'Carne' };
    const res = await request(app)
      .post('/api/split-expenses/gatherings/gathering-1/expenses')
      .set('Authorization', AUTH_HEADER)
      .send(payload);
    expect(res.status).toBe(201);
    expect(mockedSplit.addGatheringExpense).toHaveBeenCalledWith(TEST_USER.userId, 'gathering-1', payload);
  });

  it('DELETE /gatherings/:id/expenses/:expenseId returns 204', async () => {
    const res = await request(app)
      .delete('/api/split-expenses/gatherings/gathering-1/expenses/exp-1')
      .set('Authorization', AUTH_HEADER);
    expect(res.status).toBe(204);
    expect(mockedSplit.deleteGatheringExpense).toHaveBeenCalledWith(TEST_USER.userId, 'gathering-1', 'exp-1');
  });

  it('propagates 409 when gathering is settled', async () => {
    mockedSplit.addGatheringExpense.mockRejectedValue({ status: 409, message: 'La juntada está saldada' });
    const res = await request(app)
      .post('/api/split-expenses/gatherings/gathering-1/expenses')
      .set('Authorization', AUTH_HEADER)
      .send({ participantId: 'p-1', amount: 100 });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('La juntada está saldada');
  });
});
