import * as Phaser from 'phaser';

/**
 * Convert a date to a relative time string.
 * E.g. "3 minutes ago", "2 hours ago", "yesterday".
 */
export function relativeTime(date: Date | number): string {
  const now = Date.now();
  const timestamp = typeof date === 'number' ? date : date.getTime();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return '1 year ago';
  return `${diffYears} years ago`;
}

/**
 * Create a Phaser text object that auto-updates with relative time.
 * Updates every 30 seconds.
 */
export function createAutoUpdatingRelativeTime(
  scene: Phaser.Scene,
  x: number,
  y: number,
  date: Date | number,
  style?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, relativeTime(date), style ?? {
    fontFamily: 'Arial',
    fontSize: '12px',
    color: '#a0a0b0',
  });

  scene.time.addEvent({
    delay: 30000,
    loop: true,
    callback: () => {
      if (text.active) {
        text.setText(relativeTime(date));
      }
    },
  });

  return text;
}
