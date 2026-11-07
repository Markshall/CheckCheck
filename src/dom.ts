// Small helpers for building the page.

export function find<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} is missing from the page`);
  return element;
}

export function create<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function show(element: HTMLElement, visible: boolean): void {
  element.hidden = !visible;
}

export function plural(count: number, noun: string): string {
  return count.toLocaleString('en-GB') + ' ' + noun + (count === 1 ? '' : 's');
}

// The keyboard's Done (enterkeyhint) puts it away, so the results under
// the box can be seen.
export function dismissKeyboardOnEnter(field: HTMLInputElement, onEnter?: () => void): void {
  field.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onEnter?.();
    field.blur();
  });
}
