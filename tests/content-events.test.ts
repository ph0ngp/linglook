import { assert } from 'chai';

import type { ContentConfigParams } from '../src/common/content-config-params';
import type { ContentHandler as ContentHandlerClass } from '../src/content/content';

import { browser } from './browser-polyfill';

mocha.setup('bdd');

describe('Hover lookup in popups that stop pointer events', () => {
  let ContentHandler: typeof ContentHandlerClass;
  let subject: ContentHandlerClass;
  let popup: HTMLDivElement;
  let target: HTMLSpanElement;
  let lookups: string[];
  let previousVersion: string | undefined;
  let previousScriptVersion: string | undefined;

  const config: ContentConfigParams = {
    hanziDisplay: 'onlysimp',
    autoExpand: ['words'],
    tocflDisplay: false,
    copyHeadwords: 'regular',
    copyPos: 'none',
    copySenses: 'all',
    dictLang: 'en',
    enableTapLookup: true,
    fx: undefined,
    fontFace: 'system',
    fontSize: 'normal',
    highlightStyle: 'yellow',
    holdToShowKeys: [],
    holdToShowImageKeys: [],
    kanjiReferences: [],
    keys: {
      toggleDefinition: [],
      nextDictionary: [],
      expandPopup: [],
      closePopup: ['Esc'],
      pinPopup: [],
      movePopupUp: [],
      movePopupDown: [],
      startCopy: [],
    },
    noTextHighlight: false,
    popupInteractive: true,
    popupStyle: 'light',
    posDisplay: 'none',
    preferredUnits: 'metric',
    puckState: undefined,
    readingOnly: false,
    showKanjiComponents: false,
    hanvietDisplay: false,
    showPuck: 'hide',
    pinyinDisplay: true,
    pronunciationType: 'pinyin',
    tabDisplay: 'none',
    toolbarIcon: 'default',
    hskDisplay: 'hide',
  };

  before(async () => {
    (window as any).browser = browser;
    (window as any).chrome = { runtime: { id: 'content-events-test' } };
    previousVersion = (window as any).__VERSION__;
    previousScriptVersion = window.readerScriptVer;
    // Instantiate the handler ourselves instead of running the content-script
    // bootstrap, which normally connects to an extension background process.
    (window as any).__VERSION__ = 'content-events-test';
    window.readerScriptVer = 'content-events-test';
    ({ ContentHandler } = await import('../src/content/content'));
  });

  after(() => {
    (window as any).__VERSION__ = previousVersion;
    window.readerScriptVer = previousScriptVersion;
  });

  beforeEach(() => {
    popup = document.createElement('div');
    popup.setAttribute('role', 'dialog');
    popup.style.cssText =
      'position: fixed; left: 100px; top: 100px; padding: 20px; background: white; z-index: 100;';
    target = document.createElement('span');
    target.textContent = '你好';
    target.style.fontSize = '24px';
    popup.append(target);
    document.body.append(popup);
    lookups = [];
    subject = createHandler();
  });

  afterEach(() => {
    subject.detach();
    popup.remove();
  });

  function createHandler() {
    const handler = new ContentHandler(config);
    handler.setEffectiveTopMostWindow();
    // Keep real event dispatch and text hit-testing; record the dictionary
    // request without needing the extension's background process.
    handler.lookupText = async ({ text }) => {
      lookups.push(text);
    };
    return handler;
  }

  function hover() {
    const range = document.createRange();
    range.setStart(target.firstChild!, 0);
    range.setEnd(target.firstChild!, 1);
    const bounds = range.getBoundingClientRect();
    target.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: bounds.x + bounds.width / 4,
        clientY: bounds.y + bounds.height / 2,
      })
    );
  }

  it('looks up text when a popup stops bubbling without blocking its handler', () => {
    let popupHandled = false;
    popup.addEventListener('pointermove', (event) => {
      popupHandled = true;
      event.stopPropagation();
    });

    hover();

    assert.deepEqual(lookups, ['你好']);
    assert.isTrue(popupHandled);
  });

  it('looks up text when an ancestor stops events during capture', () => {
    popup.addEventListener('pointermove', (event) => event.stopPropagation(), {
      capture: true,
    });

    hover();

    assert.deepEqual(lookups, ['你好']);
  });

  it('stops lookup when detached and handles each hover once after re-enabling', () => {
    subject.detach();
    hover();
    assert.isEmpty(lookups);

    subject = createHandler();
    hover();
    assert.deepEqual(lookups, ['你好']);
  });
});
