const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Mango'];

const input = document.querySelector<HTMLInputElement>('#q')!;
const statusEl = document.querySelector<HTMLElement>('#status')!;
const results = document.querySelector<HTMLUListElement>('#results')!;

// Fake API: latency is random (150-900ms), like a real network.
function search(q: string): Promise<string[]> {
  const delay = 150 + Math.random() * 750;
  return new Promise((resolve) =>
    setTimeout(
      () => resolve(FRUITS.filter((f) => f.toLowerCase().startsWith(q.toLowerCase()))),
      delay,
    ),
  );
}

function render(items: string[]): void {
  // Replaces every <li>: old nodes are detached from the DOM.
  results.replaceChildren(
    ...items.map((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      return li;
    }),
  );
}

let timer: number | undefined;
let latest = 0;

input.addEventListener('input', () => {
  clearTimeout(timer);
  // Debounce: wait 300ms after the last keystroke.
  timer = window.setTimeout(async () => {
    const id = ++latest;
    statusEl.textContent = 'Loading…';
    const items = await search(input.value);
    if (id !== latest) return; // ignore stale responses
    statusEl.textContent = `${items.length} results`;
    render(items);
  }, 300);
});

statusEl.textContent = '';
