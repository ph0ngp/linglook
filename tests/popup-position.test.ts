import { assert } from 'chai';

import type { ShowPopupOptions } from '../src/content/popup/show-popup';
import type { QueryResult } from '../src/content/query';

mocha.setup('bdd');

describe('Popup positioning with page CSS registrations', () => {
  let showPopup: typeof import('../src/content/popup/show-popup').showPopup;
  let pageStyles: HTMLStyleElement;
  let previousChrome: unknown;
  let previousBrowser: unknown;

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
    tabDisplay: 'none',
    hskDisplay: 'hide',
  };
  const result: QueryResult = {
    title: '你好 — hello',
    words: { type: 'words', data: [], more: false, matchLen: 2 },
    resultType: 'full',
  };

  before(async () => {
    previousChrome = (window as any).chrome;
    previousBrowser = (window as any).browser;
    const runtime = { id: 'popup-position-test' };
    (window as any).chrome = { runtime };
    (window as any).browser = {
      runtime,
      i18n: { getMessage: () => '', getUILanguage: () => 'en' },
    };
    ({ showPopup } = await import('../src/content/popup/show-popup'));
  });

  beforeEach(() => {
    pageStyles = document.createElement('style');
    document.head.append(pageStyles);
  });

  afterEach(() => {
    document.getElementById('linglook-window')?.remove();
    pageStyles.remove();
  });

  after(() => {
    (window as any).chrome = previousChrome;
    (window as any).browser = previousBrowser;
  });

  function registerPageProperties() {
    // Reproduce Facebook's non-inheriting registration, including generic
    // size names that other sites may register in the same way.
    pageStyles.textContent = [
      '--left',
      '--top',
      '--max-width',
      '--max-height',
      '--min-height',
    ]
      .map((name) => `@property ${name} { syntax: "*"; inherits: false; }`)
      .join('\n');
  }

  function assertPosition(popup: NonNullable<ReturnType<typeof showPopup>>) {
    const container = popup.popup.shadowRoot!.querySelector('.container')!;
    const bounds = container.getBoundingClientRect();
    assert.closeTo(bounds.left + window.scrollX, popup.pos.x, 1);
    assert.closeTo(bounds.top + window.scrollY, popup.pos.y, 1);
    assert.isAbove(popup.pos.x, 0);
    assert.isAbove(popup.pos.y, 0);
  }

  it('positions the popup near the cursor on an ordinary page', () => {
    const popup = showPopup(result, options);
    assert.isNotNull(popup);
    assertPosition(popup!);
  });

  it('positions the popup when the page registers non-inheriting properties', () => {
    registerPageProperties();
    const popup = showPopup(result, options);
    assert.isNotNull(popup);
    assertPosition(popup!);
  });

  it('keeps width and height constraints when generic properties do not inherit', () => {
    registerPageProperties();
    const popup = showPopup(
      { ...result, title: '你好 — hello '.repeat(100) },
      {
        ...options,
        fixedPosition: {
          x: 20,
          y: 20,
          anchor: 'left',
          direction: 'disjoint',
          side: 'disjoint',
        },
        safeArea: {
          top: 0,
          left: 0,
          right: document.documentElement.clientWidth - 220,
          bottom: document.documentElement.clientHeight - 180,
        },
      }
    );
    assert.isNotNull(popup);
    assertPosition(popup!);
    const windowElement = popup!.popup.shadowRoot!.querySelector('.window')!;
    const bounds = windowElement.getBoundingClientRect();
    assert.isAtMost(bounds.right, 220);
    assert.isAtMost(bounds.bottom, 180);
  });

  it('preserves minimum height and resets constraints when the popup is reused', () => {
    registerPageProperties();
    const popup = showPopup(result, {
      ...options,
      fixMinHeight: true,
      previousHeight: 250,
    });
    assert.isNotNull(popup);
    assertPosition(popup!);
    assert.isAtLeast(
      popup!.popup.shadowRoot!.querySelector('.window')!.getBoundingClientRect()
        .height,
      250
    );

    const next = showPopup(result, {
      ...options,
      getCursorClearanceAndPos: () => ({
        cursorClearance: { top: 0, right: 0, bottom: 0, left: 0 },
        cursorPos: { x: 500, y: 300 },
      }),
    });
    assert.isNotNull(next);
    assertPosition(next!);
    assert.isBelow(
      next!.popup.shadowRoot!.querySelector('.window')!.getBoundingClientRect()
        .height,
      250
    );
  });
});
