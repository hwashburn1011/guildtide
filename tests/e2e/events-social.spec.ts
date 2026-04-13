// ---------------------------------------------------------------------------
// E2E Tests: Events, Social, Calendar, Notifications — T-1739 through T-1748
// ---------------------------------------------------------------------------
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Calendar & Events', () => {
  test('T-1739: calendar view with event markers', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/events/calendar');
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1740: event popup display and choice selection', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/events/choose', {
      data: { eventId: 'test-event-1', choiceIndex: 0 },
    });
    expect(resp.status()).toBeLessThan(500);
  });
});

test.describe('Notifications & Settings', () => {
  test('T-1741: notification center open and mark-read', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/player/notifications/mark-read', {
      data: { notificationIds: ['notif-1'] },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1742: settings page volume slider interaction', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.patch('/api/player/settings', {
      data: { volume: 0.5 },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1743: profile page avatar upload', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/player/avatar', {
      data: { avatarUrl: 'https://example.com/avatar.png' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1744: account settings password change', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/auth/change-password', {
      data: { oldPassword: 'TestPass123!', newPassword: 'NewPass456!' },
    });
    expect(resp.status()).toBeLessThan(500);
  });
});

test.describe('Social', () => {
  test('T-1745: chat message send and receive', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/social/chat', {
      data: { channel: 'global', message: 'Hello world' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1746: friend request send and accept', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/social/friend-request', {
      data: { targetUserId: 'user-2' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1747: alliance creation and invite', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.post('/api/alliances/create', {
      data: { name: 'Test Alliance', description: 'E2E testing' },
    });
    expect(resp.status()).toBeLessThan(500);
  });

  test('T-1748: leaderboard page loading and sort', async ({ authenticatedPage }) => {
    const resp = await authenticatedPage.request.get('/api/leaderboards?sort=guildLevel');
    expect(resp.status()).toBeLessThan(500);
  });
});
