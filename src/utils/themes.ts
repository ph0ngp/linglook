export function getThemeClass(theme: string): string {
  if (theme !== 'default') {
    return `theme-${theme}`;
  }

  // It is up to the call site to register for media query updates if they
  // need to respond to dark mode changes. Generally, e.g. for popups etc.,
  // however, the usage of this value is short-lived enough that it's not
  // needed.
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'theme-dark';
  }

  return 'theme-light';
}

export function getCSSVariable(
  element: HTMLElement,
  variableName: string
): string {
  return getComputedStyle(element).getPropertyValue(variableName).trim();
}

export function standardize_color(str: string): string {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) {
    // Fallback to black if we can't get a context
    return '#000000';
  }
  ctx.fillStyle = str;
  return ctx.fillStyle;
}
