import { assert } from 'chai';

import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from '../src/content/content-container';
import type { ShowPopupOptions } from '../src/content/popup/show-popup';
import type { QueryResult } from '../src/content/query';

import { browser } from './browser-polyfill';

describe('Popup above native dialogs and popovers', () => {
  let showPopup: typeof import('../src/content/popup/show-popup').showPopup;
  let fixture: HTMLDivElement;
  let modal: HTMLDialogElement;
  let nested: HTMLDialogElement;
  let pagePopover: HTMLDivElement;
  let previousChrome: unknown;
  let previousBrowser: unknown;
  const popupId = 'linglook-window';
  const puckId = 'linglook-puck';
  const result: QueryResult = {
    title: '你好 — hello',
    words: { type: 'words', data: [], more: false, matchLen: 2 },
    resultType: 'full',
  };
  const options: ShowPopupOptions = {
    hanziDisplay: 'onlysimp',
    tocflDisplay: false,
    copyNextKey: 'c',
    copyState: { kind: 'inactive' },
    dictToShow: 'words',
    displayMode: 'hover',
    fontFace: 'system',
    fxData: undefined,
    getCursorClearanceAndPos: () => ({
      cursorClearance: { top: 0, right: 0, bottom: 0, left: 0 },
      cursorPos: { x: 300, y: 200 },
    }),
    interactive: true,
    isExpanded: true,
    isVerticalText: false,
    kanjiReferences: [],
    onClosePopup: () => {},
    pointerType: 'cursor',
    posDisplay: 'none',
    positionMode: 1,
    popupStyle: 'light',
    preferredUnits: 'metric',
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    showDefinitions: true,
    hanvietDisplay: false,
    pronunciationType: 'pinyin',
    switchDictionaryKeys: [],
    tabDisplay: 'top',
    hskDisplay: 'hide',
  };

  before(async () => {
    previousChrome = (window as any).chrome;
    previousBrowser = (window as any).browser;
    (window as any).chrome = { runtime: { id: 'top-layer-test' } };
    (window as any).browser = browser;
    ({ showPopup } = await import('../src/content/popup/show-popup'));
  });

  beforeEach(() => {
    fixture = document.createElement('div');
    const style = document.createElement('style');
    // Include broad site styles and a dialog that would otherwise clip and
    // transform the popup. The popup must keep its own position and appearance.
    style.textContent = `
      dialog, [popover] {
        padding: 40px; border: 10px solid red; margin: auto;
        max-width: 400px; background: pink; overflow: hidden;
      }
      dialog { width: 320px; height: 160px; }
      #test-page-popover {
        position: fixed; inset: 0; width: 100vw; height: 100vh;
        max-width: none; border: 0; padding: 0;
      }
    `;
    modal = document.createElement('dialog');
    modal.textContent = '你好';
    nested = document.createElement('dialog');
    nested.style.transform = 'translate(35px, 20px) rotate(-3deg)';
    nested.textContent = '日历';
    pagePopover = document.createElement('div');
    pagePopover.id = 'test-page-popover';
    pagePopover.setAttribute('popover', 'auto');
    pagePopover.textContent = '学习';
    fixture.append(style, modal, nested, pagePopover);
    document.body.append(fixture);
  });

  afterEach(async () => {
    removeContentContainer([popupId, puckId]);
    fixture.remove();
    window.scrollTo(0, 0);
    await settled();
  });

  after(() => {
    (window as any).chrome = previousChrome;
    (window as any).browser = previousBrowser;
  });

  function settled() {
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  }

  function renderPopup() {
    const popup = showPopup(result, options);
    assert.isNotNull(popup);
    return popup!;
  }

  function assertUsable(popup: NonNullable<ReturnType<typeof showPopup>>) {
    const host = popup.popup;
    const windowElem = host.shadowRoot!.querySelector<HTMLElement>('.window')!;
    const bounds = windowElem.getBoundingClientRect();
    assert.isAbove(bounds.width, 0);
    assert.strictEqual(
      document.elementFromPoint(bounds.x + 10, bounds.y + 10),
      host,
      'the popup must receive pointer input above the page overlay'
    );
    const button = host.shadowRoot!.querySelector('button')!;
    button.focus();
    assert.strictEqual(
      host.shadowRoot!.activeElement,
      button,
      'the popup controls must not be inert'
    );
    const container = host.shadowRoot!.querySelector('.container')!;
    const pos = container.getBoundingClientRect();
    assert.closeTo(pos.x + window.scrollX, popup.pos.x, 1);
    assert.closeTo(pos.y + window.scrollY, popup.pos.y, 1);
    assert.equal(getComputedStyle(host).paddingTop, '0px');
    assert.equal(getComputedStyle(host).borderTopWidth, '0px');
  }

  function renderPuck() {
    const host = getOrCreateEmptyContainer({ id: puckId, styles: '' });
    const button = document.createElement('button');
    button.textContent = 'Puck';
    button.style.cssText =
      'position: fixed; left: 320px; top: 235px; width: 40px; height: 40px;';
    host.shadowRoot!.append(button);
    return { host, button };
  }

  it('paints above a page popover without dismissing it', () => {
    pagePopover.showPopover();
    assertUsable(renderPopup());
    assert.isTrue(pagePopover.matches(':popover-open'));
  });

  it('raises an existing popup above newly opened page popovers', () => {
    renderPopup();
    pagePopover.showPopover();
    assertUsable(renderPopup());
    assert.isTrue(pagePopover.matches(':popover-open'));
  });

  it('keeps controls inside the automatic popover to avoid light dismissal', () => {
    modal.showModal();
    modal.append(pagePopover);
    pagePopover.showPopover();
    const popup = renderPopup();
    const puck = renderPuck();
    assert.strictEqual(popup.popup.closest('[popover="auto"]'), pagePopover);
    assert.strictEqual(puck.host.closest('[popover="auto"]'), pagePopover);
    assertUsable(popup);
  });

  it('moves the puck into and out of a popover without requiring a lookup', async () => {
    const puck = renderPuck();
    pagePopover.showPopover();
    // Popover toggle events are queued tasks; allow their handlers to run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settled();
    assert.strictEqual(puck.host.parentElement, pagePopover);
    pagePopover.hidePopover();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settled();
    assert.strictEqual(puck.host.parentElement, document.documentElement);
    assert.isTrue(puck.host.matches(':popover-open'));
  });

  it('keeps popup controls interactive inside a modal dialog', () => {
    modal.showModal();
    const popup = renderPopup();
    assert.strictEqual(popup.popup.parentElement, modal);
    assertUsable(popup);
  });

  it('escapes clipping and transforms on the second modal dialog', () => {
    modal.showModal();
    nested.showModal();
    const popup = renderPopup();
    assert.strictEqual(popup.popup.parentElement, nested);
    assertUsable(popup);
  });

  it('moves existing containers when dialogs open and close without a lookup', async () => {
    const popup = renderPopup();
    const puck = renderPuck();
    modal.showModal();
    await settled();
    assert.strictEqual(popup.popup.parentElement, modal);
    assert.strictEqual(puck.host.parentElement, modal);
    puck.button.focus();
    assert.strictEqual(puck.host.shadowRoot!.activeElement, puck.button);
    nested.showModal();
    await settled();
    assert.strictEqual(puck.host.parentElement, nested);
    nested.close();
    await settled();
    assert.strictEqual(puck.host.parentElement, modal);
    modal.close();
    await settled();
    assert.strictEqual(popup.popup.parentElement, document.documentElement);
    assert.strictEqual(puck.host.parentElement, document.documentElement);
  });

  it('keeps the puck above the popup after re-rendering and moving into a modal', async () => {
    const puck = renderPuck();
    renderPopup();
    modal.showModal();
    await settled();
    renderPopup();
    assert.strictEqual(document.elementFromPoint(330, 245), puck.host);
    assert.strictEqual(
      puck.host.shadowRoot!.elementFromPoint(330, 245),
      puck.button
    );
  });

  it('positions correctly after scrolling the page and opening a modal', async () => {
    fixture.style.height = '3000px';
    window.scrollTo(0, 400);
    await settled();
    assert.isAbove(window.scrollY, 0);
    modal.showModal();
    assertUsable(renderPopup());
  });

  it('does not attach the popup inside a non-modal dialog', () => {
    modal.show();
    const popup = renderPopup();
    assert.strictEqual(popup.popup.parentElement, document.documentElement);
    assertUsable(popup);
  });

  it('cleans up and re-registers dialog observation when re-enabled', async () => {
    renderPopup();
    removeContentContainer(popupId);
    assert.isNull(document.getElementById(popupId));
    const popup = renderPopup();
    modal.showModal();
    await settled();
    assert.strictEqual(popup.popup.parentElement, modal);
    assertUsable(popup);
  });

  it('preserves ordinary lookup when the Popover API is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'popover'
    )!;
    try {
      Reflect.deleteProperty(HTMLElement.prototype, 'popover');
      const popup = renderPopup();
      assert.isFalse(popup.popup.hasAttribute('popover'));
      assertUsable(popup);
    } finally {
      removeContentContainer(popupId);
      Object.defineProperty(HTMLElement.prototype, 'popover', descriptor);
    }
  });
});
