import { assert } from 'chai';

import { getScrollOffset } from '../src/content/scroll-offset';
import {
  getPageTargetProps,
  textBoxSizeLengths,
} from '../src/content/target-props';

describe('selection measurements for popup positioning', () => {
  let fixture: HTMLDivElement;

  beforeEach(() => {
    fixture = document.createElement('div');
    fixture.style.cssText =
      'position:absolute;left:20px;top:20px;font:32px/48px sans-serif;white-space:pre';
    document.body.append(fixture);
  });

  afterEach(() => {
    fixture.remove();
  });

  function measure(text: string, start = 0, end = text.length) {
    fixture.textContent = text;
    const node = fixture.firstChild as Text;
    const measuredText: Array<string> = [];
    const getClientRects = Range.prototype.getClientRects;
    // Observe the text actually passed to the browser's layout engine, while
    // still using real layout. Some browsers paint half a surrogate pair as
    // a whole glyph, which would otherwise hide the invalid range.
    Range.prototype.getClientRects = function () {
      measuredText.push(this.toString());
      return getClientRects.call(this);
    };
    try {
      const props = getPageTargetProps({
        fromPuck: false,
        fromTouch: true,
        target: fixture,
        textRange: [{ node, start, end }],
      });
      assert.isDefined(props.textBoxSizes);
      return { sizes: props.textBoxSizes!, measuredText, node };
    } finally {
      Range.prototype.getClientRects = getClientRects;
    }
  }

  function expectedBox(node: Text, start: number, end: number) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const rect = range.getBoundingClientRect();
    const scroll = getScrollOffset();
    return {
      left: rect.left + scroll.scrollX,
      top: rect.top + scroll.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }

  for (const writingMode of ['horizontal-tb', 'vertical-rl'] as const) {
    it(`measures the complete first rare character in ${writingMode} text`, () => {
      fixture.style.writingMode = writingMode;
      const { sizes, measuredText, node } = measure('𠮷中文');
      assert.strictEqual(measuredText[0], '𠮷');
      assert.deepEqual(sizes[1], expectedBox(node, 0, 2));
    });
  }

  for (const size of [4, 8, 12, 16] as const) {
    it(`includes the complete rare character at the ${size}-unit boundary`, () => {
      const prefix = '中'.repeat(size - 1) + '𠮷';
      const { sizes, measuredText, node } = measure(prefix + '文');
      assert.include(measuredText, prefix);
      assert.deepEqual(sizes[size], expectedBox(node, 0, prefix.length));
    });
  }

  it('handles a selection starting partway through a text node', () => {
    const { sizes, measuredText, node } = measure('前𠮷中文', 1);
    assert.strictEqual(measuredText[0], '𠮷');
    assert.deepEqual(sizes[1], expectedBox(node, 1, 3));
  });

  it('clamps all measurements to a selection containing one rare character', () => {
    const { sizes, measuredText, node } = measure('前𠮷后', 1, 3);
    assert.deepEqual(measuredText, ['𠮷']);
    for (const size of textBoxSizeLengths) {
      assert.deepEqual(sizes[size], expectedBox(node, 1, 3));
    }
  });

  it('keeps ordinary Chinese boundaries before an adjacent rare character', () => {
    const { sizes, measuredText, node } = measure('中国中文𠮷');
    assert.strictEqual(measuredText[0], '中');
    assert.include(measuredText, '中国中文');
    assert.deepEqual(sizes[1], expectedBox(node, 0, 1));
    assert.deepEqual(sizes[4], expectedBox(node, 0, 4));
  });

  it('does not include the next character when a pair ends on a boundary', () => {
    const { sizes, measuredText, node } = measure('𠮷𠮷中文');
    assert.include(measuredText, '𠮷𠮷');
    assert.deepEqual(sizes[4], expectedBox(node, 0, 4));
  });
});
