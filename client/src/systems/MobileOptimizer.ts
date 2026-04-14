// ---------------------------------------------------------------------------
// Mobile Optimization System — Guildtide
// T-1931 through T-1980 (touch, responsive, PWA, performance, offline)
// ---------------------------------------------------------------------------
import * as Phaser from 'phaser';

// ---- Device Detection (T-1975) -------------------------------------------

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  hasNotch: boolean;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  connectionType: string;
  prefersReducedMotion: boolean;
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid || /mobile/.test(ua);
  const isTablet = /ipad|tablet/.test(ua) || (isAndroid && !/mobile/.test(ua));
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Detect notch via safe-area-inset
  const hasNotch = (() => {
    const div = document.createElement('div');
    div.style.paddingTop = 'env(safe-area-inset-top, 0px)';
    document.body.appendChild(div);
    const val = parseInt(getComputedStyle(div).paddingTop) > 0;
    document.body.removeChild(div);
    return val;
  })();

  const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;

  return {
    isMobile,
    isTablet,
    isTouch,
    isIOS,
    isAndroid,
    isPWA,
    hasNotch,
    pixelRatio: window.devicePixelRatio || 1,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    isLandscape: window.innerWidth > window.innerHeight,
    connectionType: conn?.effectiveType ?? 'unknown',
    prefersReducedMotion,
  };
}

// ---- Touch Gesture Handlers (T-1931 through T-1935) -----------------------

export interface GestureCallbacks {
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
}

export class TouchGestureHandler {
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private initialPinchDist = 0;
  private element: HTMLElement;
  private callbacks: GestureCallbacks;

  private static readonly SWIPE_THRESHOLD = 50;
  private static readonly LONG_PRESS_MS = 500;

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.element = element;
    this.callbacks = callbacks;
    this.bind();
  }

  private bind(): void {
    this.element.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd, { passive: true });
    this.element.addEventListener('touchcancel', this.onTouchCancel, { passive: true });
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    this.element.removeEventListener('touchcancel', this.onTouchCancel);
  }

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.startX = t.clientX;
      this.startY = t.clientY;
      this.startTime = Date.now();

      // T-1933: Long-press detection
      this.longPressTimer = setTimeout(() => {
        this.callbacks.onLongPress?.(this.startX, this.startY);
        this.longPressTimer = null;
      }, TouchGestureHandler.LONG_PRESS_MS);
    }

    // T-1935: Pinch-to-zoom
    if (e.touches.length === 2) {
      this.cancelLongPress();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.initialPinchDist = Math.hypot(dx, dy);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    this.cancelLongPress();

    // Pinch gesture
    if (e.touches.length === 2 && this.initialPinchDist > 0) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / this.initialPinchDist;
      this.callbacks.onPinch?.(scale);
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    this.cancelLongPress();

    if (e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const dx = t.clientX - this.startX;
      const dy = t.clientY - this.startY;
      const elapsed = Date.now() - this.startTime;

      const dist = Math.hypot(dx, dy);

      if (dist < 10 && elapsed < 300) {
        // T-1931: Tap
        this.callbacks.onTap?.(t.clientX, t.clientY);
        // T-1932: Visual ripple feedback
        this.showTapRipple(t.clientX, t.clientY);
        return;
      }

      // T-1934: Swipe detection
      if (dist > TouchGestureHandler.SWIPE_THRESHOLD) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) this.callbacks.onSwipeRight?.();
          else this.callbacks.onSwipeLeft?.();
        } else {
          if (dy > 0) this.callbacks.onSwipeDown?.();
          else this.callbacks.onSwipeUp?.();
        }
      }
    }

    this.initialPinchDist = 0;
  };

  private onTouchCancel = (): void => {
    this.cancelLongPress();
    this.initialPinchDist = 0;
  };

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // T-1932: Visual ripple effect
  private showTapRipple(x: number, y: number): void {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position:fixed; left:${x - 20}px; top:${y - 20}px;
      width:40px; height:40px; border-radius:50%;
      background:rgba(233,69,96,0.3); pointer-events:none;
      animation:guildtide-ripple 0.4s ease-out forwards; z-index:99999;
    `;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  }
}

// ---- Canvas Scaling (T-1937) ----------------------------------------------

export function setupCanvasScaling(game: Phaser.Game): void {
  const resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    game.scale.resize(w, h);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => {
    setTimeout(resize, 100);
  });

  resize();
}

// ---- PWA Install Prompt (T-1946) ------------------------------------------

let _deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export async function showInstallPrompt(): Promise<boolean> {
  if (!_deferredPrompt) return false;
  await _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;
  _deferredPrompt = null;
  return outcome === 'accepted';
}

export function canInstallPWA(): boolean {
  return _deferredPrompt !== null;
}

// ---- Push Notification Support (T-1947, T-1948) ---------------------------

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        'YOUR_VAPID_PUBLIC_KEY_PLACEHOLDER'
      ) as BufferSource,
    });
    return sub;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

// ---- Offline Detection (T-1944) -------------------------------------------

export type ConnectionStatus = 'online' | 'offline';

export function initOfflineDetection(
  onStatusChange: (status: ConnectionStatus) => void,
): () => void {
  const handleOnline = (): void => onStatusChange('online');
  const handleOffline = (): void => onStatusChange('offline');

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial status
  onStatusChange(navigator.onLine ? 'online' : 'offline');

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ---- Performance Profiling (T-1954, T-1955) -------------------------------

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsedMB: number;
  domNodes: number;
}

export class PerformanceProfiler {
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private running = false;

  start(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
  }

  private tick = (): void => {
    if (!this.running) return;
    const now = performance.now();
    this.frameTimes.push(now - this.lastFrameTime);
    this.lastFrameTime = now;
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    requestAnimationFrame(this.tick);
  };

  getMetrics(): PerformanceMetrics {
    const avg = this.frameTimes.length > 0
      ? this.frameTimes.reduce((s, t) => s + t, 0) / this.frameTimes.length
      : 16.67;

    const mem = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;

    return {
      fps: Math.round(1000 / avg),
      frameTime: Math.round(avg * 100) / 100,
      memoryUsedMB: mem?.usedJSHeapSize
        ? Math.round((mem.usedJSHeapSize / 1024 / 1024) * 10) / 10
        : 0,
      domNodes: document.querySelectorAll('*').length,
    };
  }
}

// ---- Battery Saver Mode (T-1957) ------------------------------------------

export interface BatterySaverConfig {
  reduceAnimations: boolean;
  reduceParticles: boolean;
  lowerFPSTarget: boolean;
  disableWeatherEffects: boolean;
}

export function getBatterySaverConfig(enabled: boolean): BatterySaverConfig {
  if (!enabled) {
    return {
      reduceAnimations: false,
      reduceParticles: false,
      lowerFPSTarget: false,
      disableWeatherEffects: false,
    };
  }
  return {
    reduceAnimations: true,
    reduceParticles: true,
    lowerFPSTarget: true,
    disableWeatherEffects: true,
  };
}

// ---- Mobile Keyboard Handling (T-1970) ------------------------------------

export function initKeyboardHandling(): () => void {
  const viewport = document.querySelector('meta[name="viewport"]');
  const originalContent = viewport?.getAttribute('content') ?? '';

  const handleFocus = (e: FocusEvent): void => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Prevent viewport zoom on iOS
      if (viewport) {
        viewport.setAttribute(
          'content',
          originalContent + ', maximum-scale=1',
        );
      }
    }
  };

  const handleBlur = (): void => {
    if (viewport) {
      viewport.setAttribute('content', originalContent);
    }
  };

  document.addEventListener('focusin', handleFocus);
  document.addEventListener('focusout', handleBlur);

  return () => {
    document.removeEventListener('focusin', handleFocus);
    document.removeEventListener('focusout', handleBlur);
  };
}

// ---- Safe Area Insets (T-1961) --------------------------------------------

export function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const compute = (prop: string): number => {
    const div = document.createElement('div');
    div.style.paddingTop = `env(${prop}, 0px)`;
    document.body.appendChild(div);
    const val = parseInt(getComputedStyle(div).paddingTop) || 0;
    document.body.removeChild(div);
    return val;
  };

  return {
    top: compute('safe-area-inset-top'),
    bottom: compute('safe-area-inset-bottom'),
    left: compute('safe-area-inset-left'),
    right: compute('safe-area-inset-right'),
  };
}

// ---- Orientation Lock (T-1971) --------------------------------------------

export async function lockOrientation(
  orientation: 'portrait' | 'landscape' | 'any',
): Promise<boolean> {
  try {
    const screen = window.screen as unknown as {
      orientation?: { lock?: (o: string) => Promise<void> };
    };
    if (orientation === 'any') {
      await screen.orientation?.lock?.('any');
    } else {
      await screen.orientation?.lock?.(orientation);
    }
    return true;
  } catch {
    return false;
  }
}

// ---- Haptic Feedback (T-1967) ---------------------------------------------

export function triggerHaptic(
  style: 'light' | 'medium' | 'heavy' = 'light',
): void {
  const nav = navigator as unknown as { vibrate?: (pattern: number | number[]) => boolean };
  if (!nav.vibrate) return;
  switch (style) {
    case 'light':
      nav.vibrate(10);
      break;
    case 'medium':
      nav.vibrate(25);
      break;
    case 'heavy':
      nav.vibrate([30, 10, 30]);
      break;
  }
}

// ---- Web Share API (T-1969) -----------------------------------------------

export async function shareContent(
  title: string,
  text: string,
  url?: string,
): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share({ title, text, url: url ?? window.location.href });
    return true;
  } catch {
    return false;
  }
}

// ---- Passive Scroll Listeners (T-1976) ------------------------------------

export function addPassiveScrollListener(
  element: HTMLElement | Window,
  handler: (e: Event) => void,
): () => void {
  element.addEventListener('scroll', handler, { passive: true });
  element.addEventListener('touchmove', handler, { passive: true });
  return () => {
    element.removeEventListener('scroll', handler);
    element.removeEventListener('touchmove', handler);
  };
}

// ---- Service Worker Registration ------------------------------------------

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch {
    return null;
  }
}

// ---- Initialization -------------------------------------------------------

export function initMobileOptimizations(game?: Phaser.Game): void {
  const device = detectDevice();

  // Register SW for PWA
  registerServiceWorker();

  // Setup install prompt
  initInstallPrompt();

  // Offline detection with banner
  initOfflineDetection((status) => {
    const banner = document.getElementById('offline-banner');
    if (banner) {
      banner.style.display = status === 'offline' ? 'block' : 'none';
    }
  });

  // Canvas scaling
  if (game) {
    setupCanvasScaling(game);
  }

  // Mobile keyboard handling
  if (device.isMobile) {
    initKeyboardHandling();
  }

  // Inject tap ripple animation CSS
  if (device.isTouch) {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes guildtide-ripple {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Inject viewport meta tag (T-1936)
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    document.head.appendChild(viewport);
  }
  viewport.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no',
  );
}
