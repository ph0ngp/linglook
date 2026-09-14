// Measure with the same font as the control: CJK fallback glyphs are not
// necessarily one em wide on every platform (including Linux CI runners).
export function getTextWidth(element: HTMLElement, text: string): number {
  const span = document.createElement('span');
  span.style.cssText = 'position:absolute;white-space:pre;visibility:hidden';
  span.style.font = getComputedStyle(element).font;
  span.textContent = text;
  document.body.append(span);
  const width = span.getBoundingClientRect().width;
  span.remove();
  return width;
}
