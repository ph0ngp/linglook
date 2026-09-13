// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isIOS } from '../utils/ua-utils';

import { LookupPuck, LookupPuckId } from './puck';
import type { SafeAreaProvider } from './safe-area-provider';

vi.mock('../utils/ua-utils', () => ({ isIOS: vi.fn(() => true) }));
vi.mock('webextension-polyfill', () => ({ default: {} }));
// Gesture tests use jsdom without layout and do not need to compile styles.
vi.mock('../../css/puck.css?inline', () => ({ default: '' }));

describe('LookupPuck taps', () => {
  let subject: LookupPuck;
  let puckElement: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(isIOS).mockReturnValue(true);
    // jsdom does not implement PointerEvent or pointer capture.
    vi.stubGlobal(
      'PointerEvent',
      class extends MouseEvent {
        readonly pointerId: number;

        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
        }
      }
    );

    subject = new LookupPuck({
      initialPosition: { x: 100, y: 100, orientation: 'above' },
      safeAreaProvider: {
        getSafeArea: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as SafeAreaProvider,
      onLookupDisabled: () => {},
      onPuckStateChanged: () => {},
    });
    subject.render({ icon: 'default', theme: 'blue' });
    subject.setEnabledState('active');

    const container = document.getElementById(LookupPuckId)!;
    puckElement = container.shadowRoot!.querySelector('.puck')!;
    puckElement.setPointerCapture = vi.fn();
  });

  afterEach(() => {
    subject.unmount();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('disables lookup on a single tap despite iOS emitting mouse events', () => {
    dispatchPointerTap();
    dispatchMouseTap(1);
    vi.advanceTimersByTime(300);

    expect(subject.getEnabledState()).toBe('inactive');
    expect(subject.getTargetOrientation()).toBe('above');
  });

  it('re-enables lookup on a single tap when inactive', () => {
    subject.setEnabledState('inactive');

    dispatchPointerTap();
    dispatchMouseTap(1);
    vi.advanceTimersByTime(300);

    expect(subject.getEnabledState()).toBe('active');
    expect(subject.getTargetOrientation()).toBe('above');
  });

  it('reverses direction when iOS swallows the second tap pointer events', () => {
    dispatchPointerTap();
    dispatchMouseTap(1);
    vi.advanceTimersByTime(100);
    dispatchMouseTap(2);
    vi.advanceTimersByTime(300);

    expect(subject.getEnabledState()).toBe('active');
    expect(subject.getTargetOrientation()).toBe('below');
  });

  it('prevents default mouse actions on the first tap to suppress page zoom', () => {
    dispatchPointerTap();
    const [down, up] = dispatchMouseTap(1);

    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
  });

  it('reverses direction only once when both taps also emit pointer events', () => {
    dispatchPointerTap();
    dispatchMouseTap(1);
    vi.advanceTimersByTime(100);
    dispatchPointerTap();
    dispatchMouseTap(2);
    vi.advanceTimersByTime(300);

    expect(subject.getEnabledState()).toBe('active');
    expect(subject.getTargetOrientation()).toBe('below');
  });

  it('does not toggle lookup or reverse direction after dragging', () => {
    dispatchPointerEvent('pointerdown');
    vi.advanceTimersByTime(301);
    dispatchPointerEvent('pointerup');
    dispatchMouseTap(1);
    vi.advanceTimersByTime(300);

    expect(subject.getEnabledState()).toBe('active');
    expect(subject.getTargetOrientation()).toBe('above');
  });

  it('leaves compatibility mouse events alone outside iOS', () => {
    vi.mocked(isIOS).mockReturnValue(false);

    dispatchPointerTap();
    const [down, up] = dispatchMouseTap(1);
    vi.advanceTimersByTime(300);

    expect(down.defaultPrevented).toBe(false);
    expect(up.defaultPrevented).toBe(false);
    expect(subject.getEnabledState()).toBe('inactive');
    expect(subject.getTargetOrientation()).toBe('above');
  });

  function dispatchPointerTap() {
    dispatchPointerEvent('pointerdown');
    dispatchPointerEvent('pointerup');
  }

  function dispatchPointerEvent(type: 'pointerdown' | 'pointerup') {
    const target = type === 'pointerdown' ? puckElement : window;
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
      })
    );
  }

  function dispatchMouseTap(detail: number): [MouseEvent, MouseEvent] {
    const init = { bubbles: true, cancelable: true, detail };
    const down = new MouseEvent('mousedown', init);
    const up = new MouseEvent('mouseup', init);
    puckElement.dispatchEvent(down);
    puckElement.dispatchEvent(up);
    return [down, up];
  }
});
