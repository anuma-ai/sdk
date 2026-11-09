export function* getStageElements(root: HTMLElement | ShadowRoot): Generator<HTMLElement> {
  if (root instanceof HTMLElement && root.shadowRoot) {
    yield* getStageElements(root.shadowRoot);
  }
  for (const el of root.querySelectorAll("*")) {
    if (el instanceof HTMLElement && el.hasAttribute("data-id")) yield el;
    if (el.shadowRoot) yield* getStageElements(el.shadowRoot);
  }
}

export function findStageElement(stage: HTMLElement | null, id: string): HTMLElement | null {
  if (!stage) return null;
  if (stage.dataset.id === id) return stage;
  for (const el of getStageElements(stage)) {
    if (el.dataset.id === id) return el;
  }
  return null;
}

export function containsStageElement(container: HTMLElement, el: Element): boolean {
  let current = el;
  while (!container.contains(current)) {
    const root = current.getRootNode();
    if (!(root instanceof ShadowRoot)) return false;
    current = root.host;
  }
  return true;
}

export function getStageElementsAtPoint(stage: HTMLElement, x: number, y: number): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const visitedRoots = new Set<Document | ShadowRoot>();
  const visitedElements = new Set<Element>();
  function visit(root: Document | ShadowRoot) {
    if (visitedRoots.has(root)) return;
    visitedRoots.add(root);
    for (const el of root.elementsFromPoint?.(x, y) ?? []) {
      if (el.shadowRoot) visit(el.shadowRoot);
      if (visitedElements.has(el)) continue;
      visitedElements.add(el);
      if (el instanceof HTMLElement && containsStageElement(stage, el)) elements.push(el);
    }
  }
  visit(stage.ownerDocument);
  return elements;
}
