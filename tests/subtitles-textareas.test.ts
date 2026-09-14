import { assert } from 'chai';

import { clearPreviousResult, getTextAtPoint } from '../src/content/get-text';
import { isChromium } from '../src/utils/ua-utils';

describe('subtitle and multiline textarea lookup', () => {
  let fixture: HTMLDivElement;

  beforeEach(() => {
    fixture = document.createElement('div');
    fixture.style.cssText = 'position:fixed;left:20px;top:20px;width:600px';
    document.body.append(fixture);
  });

  afterEach(() => {
    fixture.remove();
    clearPreviousResult();
  });

  function subtitlePoint() {
    const node = fixture.querySelector('#subtitle')!.firstChild!;
    const range = new Range();
    range.setStart(node, 0);
    range.setEnd(node, 1);
    const box = range.getBoundingClientRect();
    return { x: box.left + 2, y: box.top + box.height / 2 };
  }

  function pageStyles() {
    return Array.from(fixture.querySelectorAll<HTMLElement>('*')).map(
      (element) => ({
        inline: element.style.cssText,
        pointerEvents: getComputedStyle(element).pointerEvents,
      })
    );
  }

  function plexFixture({
    overlay,
    pointerEvents,
  }: {
    overlay: boolean;
    pointerEvents: boolean;
  }) {
    fixture.innerHTML = `
      <style>
        #plex-player { position:relative; height:300px; background:#222; }
        #plex-player video, .libjass-wrapper, .libjass-subs {
          position:absolute; inset:0; width:100%; height:100%;
        }
        .libjass-subs, .libjass-subs * {
          pointer-events:${pointerEvents ? 'none' : 'auto'};
        }
        .libjass-subs { line-height:0; overflow:hidden; }
        .an2 { position:absolute; bottom:30px; width:100%; text-align:center; }
        #subtitle { font:32px/48px sans-serif; color:white; }
      </style>
      <div id="plex-player">
        <video></video>
        <div class="libjass-wrapper">
          <div class="libjass-subs paused">
            <div class="layer layer0"><div class="an an2">
              <span style="display:inline-block"><span id="subtitle">你好世界</span></span>
            </div></div>
          </div>
        </div>
        ${overlay ? '<div id="play-pause-overlay" style="position:absolute;inset:0;cursor:none"></div>' : ''}
      </div>`;
  }

  for (const [name, options] of [
    [
      'through an empty play/pause overlay',
      { overlay: true, pointerEvents: false },
    ],
    ['with pointer events disabled', { overlay: false, pointerEvents: true }],
    ['with both Plex obstacles', { overlay: true, pointerEvents: true }],
  ] as const) {
    it(`finds subtitles ${name} and restores page styles`, () => {
      plexFixture(options);
      const point = subtitlePoint();
      const before = pageStyles();
      if (options.overlay) {
        assert.strictEqual(
          document.elementFromPoint(point.x, point.y),
          fixture.querySelector('#play-pause-overlay')
        );
      }

      const result = getTextAtPoint({ point });

      assert.strictEqual(result?.text, '你好世界');
      assert.strictEqual(
        result?.textRange?.[0].node,
        fixture.querySelector('#subtitle')!.firstChild
      );
      assert.deepEqual(
        pageStyles(),
        before,
        'Temporary styles must be restored'
      );
      if (options.overlay) {
        assert.strictEqual(
          document.elementFromPoint(point.x, point.y),
          fixture.querySelector('#play-pause-overlay'),
          'Play/pause overlay must still receive clicks'
        );
      }
    });
  }

  for (const coveringElement of [
    '<div style="background:black"></div>',
    '<div style="background-image:linear-gradient(black,black)"></div>',
    '<canvas></canvas>',
    '<video></video>',
  ]) {
    it(`does not look through visible content: ${coveringElement}`, () => {
      plexFixture({ overlay: false, pointerEvents: false });
      const cover = document.createElement('div');
      cover.innerHTML = coveringElement;
      const element = cover.firstElementChild as HTMLElement;
      element.style.position = 'absolute';
      element.style.inset = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      fixture.querySelector('#plex-player')!.append(element);
      assert.isNull(getTextAtPoint({ point: subtitlePoint() }));
    });
  }

  function textarea(value: string) {
    const input = document.createElement('textarea');
    input.value = value;
    // CJK glyphs are 20px wide; explicit line-height makes each row predictable.
    input.style.cssText =
      'display:block;box-sizing:border-box;width:240px;height:160px;padding:0;border:0;margin:0;font:20px/30px monospace;resize:none';
    fixture.append(input);
    return input;
  }

  function lookupRow(input: HTMLTextAreaElement, row: number, column = 0) {
    clearPreviousResult();
    const box = input.getBoundingClientRect();
    return getTextAtPoint({
      point: { x: box.left + column * 20 + 2, y: box.top + row * 30 + 15 },
    });
  }

  it('finds the correct character after explicit newlines, including an empty line', () => {
    const input = textarea('你好\n世界\n\n学习中文');
    for (const [row, column, offset, text] of [
      [0, 0, 0, '你好'],
      [1, 0, 3, '世界'],
      [3, 1, 8, '习中文'],
    ] as const) {
      const result = lookupRow(input, row, column);
      assert.strictEqual(result?.text, text, `Text on row ${row + 1}`);
      assert.strictEqual(result?.textRange?.[0].node, input);
      assert.strictEqual(result?.textRange?.[0].start, offset);
    }
  });

  it('finds text after wrapping within a paragraph following a newline', () => {
    const input = textarea('你好\n世界学习中文');
    input.style.width = '65px';
    const result = lookupRow(input, 2);
    assert.strictEqual(result?.text, '习中文');
    assert.strictEqual(result?.textRange?.[0].start, 6);
  });

  for (const overlay of ['dialog', 'popover'] as const) {
    it(`finds multiline text inside a ${overlay}`, () => {
      const container = document.createElement('dialog');
      fixture.append(container);
      const input = textarea('你好\n世界');
      container.append(input);
      if (overlay === 'dialog') {
        container.showModal();
      } else {
        container.popover = 'auto';
        container.showPopover();
      }
      const result = lookupRow(input, 1);
      assert.strictEqual(result?.text, '世界');
      assert.strictEqual(result?.textRange?.[0].start, 3);
    });
  }

  it('works around Chromium returning a line-relative textarea offset', function () {
    if (!isChromium()) {
      this.skip();
    }
    const input = textarea('你好\n世界');
    const descriptor = Object.getOwnPropertyDescriptor(
      document,
      'caretPositionFromPoint'
    );
    // Reproduce Chromium issue 446475645 even on versions that have fixed it.
    // The fallback still uses the browser's real caretRangeFromPoint and layout.
    Object.defineProperty(document, 'caretPositionFromPoint', {
      configurable: true,
      value: () => ({ offsetNode: input, offset: 0 }),
    });
    try {
      const result = lookupRow(input, 1);
      assert.strictEqual(result?.text, '世界');
      assert.strictEqual(result?.textRange?.[0].start, 3);
    } finally {
      if (descriptor) {
        Object.defineProperty(document, 'caretPositionFromPoint', descriptor);
      } else {
        delete document.caretPositionFromPoint;
      }
    }
  });

  it('looks up scrolled text without changing the value, selection, focus, or scroll', () => {
    const input = textarea('你好\n世界\n学习\n中文\n朋友\n学校');
    input.style.height = '60px';
    input.focus();
    input.setSelectionRange(1, 4, 'backward');
    input.scrollTop = 90;
    const before = {
      value: input.value,
      start: input.selectionStart,
      end: input.selectionEnd,
      direction: input.selectionDirection,
      scrollTop: input.scrollTop,
      elementCount: document.querySelectorAll('*').length,
    };

    const result = lookupRow(input, 0);

    assert.strictEqual(result?.text, '中文');
    assert.strictEqual(result?.textRange?.[0].start, 9);
    assert.strictEqual(input.value, before.value);
    assert.strictEqual(input.selectionStart, before.start);
    assert.strictEqual(input.selectionEnd, before.end);
    assert.strictEqual(input.selectionDirection, before.direction);
    assert.strictEqual(input.scrollTop, before.scrollTop);
    assert.strictEqual(document.activeElement, input);
    assert.strictEqual(
      document.querySelectorAll('*').length,
      before.elementCount,
      'Mirror elements must be removed'
    );
  });

  it('does not return text past the end of a later line or outside the textarea', () => {
    const input = textarea('你好\n世界');
    assert.isNull(lookupRow(input, 1, 8));
    assert.isNull(lookupRow(input, 1, 14));
    assert.isNull(lookupRow(input, 4));
  });
});
