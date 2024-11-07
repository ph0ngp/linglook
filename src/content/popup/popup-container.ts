export function getPopupContainer(): HTMLElement | null {
  const hostElem = document.getElementById('linglook-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.container')
    : null;
}

export function isPopupWindowHostElem(
  target: EventTarget | Node | null
): boolean {
  return target instanceof HTMLElement && target.id === 'linglook-window';
}
