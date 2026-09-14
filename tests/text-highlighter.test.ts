// sort-imports-ignore

import { assert } from 'chai';

import { browser } from './browser-polyfill';

(window as any).browser = browser;

// Make sure the browser polyfill believes we are in an extension context
(window as any).chrome = {
  runtime: {
    id: 'test',
  },
};

import type { TextHighlighter as TextHighlighterClass } from '../src/content/text-highlighter';

let TextHighlighter: typeof TextHighlighterClass;

describe('TextHighligher', () => {
  let testDiv: HTMLDivElement;
  let subject: TextHighlighterClass;

  before(async () => {
    ({ TextHighlighter } = await import('../src/content/text-highlighter'));
  });

  beforeEach(() => {
    subject = new TextHighlighter();
    testDiv = document.createElement('div');
    testDiv.setAttribute('id', 'test-div');
    // Stick the div at the top as if the div is offscreen,
    // caretPositionFromPoint won't work
    testDiv.style.position = 'fixed';
    testDiv.style.top = '0px';
    document.body.append(testDiv);
  });

  afterEach(() => {
    document.getElementById('test-div')!.remove();
    subject.detach();
  });

  it('should highlight text in a textbox', () => {
    testDiv.innerHTML = '<input type="text" value="あいうえお">';
    const textBox = testDiv.firstChild as HTMLInputElement;

    subject.highlight({
      length: 3,
      textRange: [{ node: textBox, start: 1, end: 5 }],
    });

    assert.strictEqual(textBox.selectionStart, 1);
    assert.strictEqual(textBox.selectionEnd, 4);
  });

  it('preserves scroll when focusing an unfocused multiline textarea to highlight it', async () => {
    const textBox = document.createElement('textarea');
    textBox.value = '你好\n世界\n学习\n中文\n朋友\n学校';
    textBox.style.cssText =
      'height:60px;width:200px;padding:0;border:0;font:20px/30px monospace';
    testDiv.append(textBox);
    // Initialize Firefox's editor, then prepare an unfocused, scrolled field.
    textBox.focus();
    textBox.blur();
    textBox.setSelectionRange(0, 0);
    textBox.scrollTop = 90;
    const scrollTop = textBox.scrollTop;
    assert.isAbove(scrollTop, 0);
    assert.notStrictEqual(document.activeElement, textBox);

    subject.highlight({
      length: 2,
      textRange: [{ node: textBox, start: 9, end: 11 }],
    });
    // Highlighting restores scroll on the next animation frame.
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    assert.strictEqual(textBox.selectionStart, 9);
    assert.strictEqual(textBox.selectionEnd, 11);
    assert.strictEqual(textBox.scrollTop, scrollTop);
  });
});
