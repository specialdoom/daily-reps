import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";
import { Feed } from "./Feed";

vi.mock("./api", async (importActual) => {
  const actual = await importActual<typeof import("./api")>();
  return { ...actual, fetchPage: vi.fn(actual.fetchPage) };
});
const fetchPage = vi.mocked(api.fetchPage);

class MockObserver {
  static all: MockObserver[] = [];
  disconnected = false;
  targets: Element[] = [];
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockObserver.all.push(this);
  }
  observe(el: Element) {
    this.targets.push(el);
    // Like the real API: every observe() delivers an initial entry, asynchronously.
    queueMicrotask(() => this.fire(sentinelTop < window.innerHeight));
  }
  disconnect() {
    this.disconnected = true;
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    if (this.disconnected) return;
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

// jsdom has no layout: control where the sentinel "is" relative to the viewport.
let sentinelTop = 10_000;

const live = () => MockObserver.all.filter((o) => !o.disconnected);
const ids = () =>
  screen
    .queryAllByRole("listitem")
    .map((li) => li.textContent)
    .filter((text) => text && text !== "Loading…").length;
const requestedCursors = () => fetchPage.mock.calls.map(([cursor]) => cursor);

async function settle(ms = 300) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function scrollToBottom(times = 1) {
  // Real observer callbacks arrive as tasks, after pending microtasks have run.
  await act(async () => {
    await Promise.resolve();
    for (let i = 0; i < times; i++) live().forEach((o) => o.fire(true));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  MockObserver.all = [];
  sentinelTop = 10_000;
  fetchPage.mockClear();
  vi.stubGlobal("IntersectionObserver", MockObserver);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ top: sentinelTop }) as DOMRect,
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loading pages", () => {
  it("loads the first page when the sentinel becomes visible", async () => {
    render(<Feed feedId="a" />);
    await scrollToBottom();
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");

    await settle();

    expect(ids()).toBe(20);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("requests each cursor once, however often the sentinel fires", async () => {
    render(<Feed feedId="a" />);
    for (let page = 0; page < 3; page++) {
      await scrollToBottom(10);
      await settle();
    }

    expect(requestedCursors()).toEqual([0, 1, 2]);
    expect(ids()).toBe(60);
  });

  it("stops after the last page", async () => {
    render(<Feed feedId="a" />);
    for (let page = 0; page < 7; page++) {
      await scrollToBottom();
      await settle();
    }

    expect(ids()).toBe(100);
    expect(requestedCursors()).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps loading without scroll events while the sentinel stays visible", async () => {
    sentinelTop = 0;
    render(<Feed feedId="a" />);
    for (let page = 0; page < 6; page++) await settle();

    expect(ids()).toBe(100);
    expect(requestedCursors()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("observer lifecycle", () => {
  it("creates one observer per mount and disconnects it on unmount", async () => {
    const { unmount } = render(<Feed feedId="a" />);
    for (let page = 0; page < 3; page++) {
      await scrollToBottom();
      await settle();
    }
    expect(MockObserver.all).toHaveLength(1);

    unmount();

    expect(MockObserver.all[0].disconnected).toBe(true);
  });

  it("keeps exactly one live observer across feed switches", () => {
    const { rerender } = render(<Feed feedId="a" />);
    rerender(<Feed feedId="b" />);
    rerender(<Feed feedId="c" />);

    expect(live()).toHaveLength(1);
  });
});

describe("switching feeds", () => {
  it("aborts the pending request and never shows the old feed's page", async () => {
    const { rerender } = render(<Feed feedId="a" />);
    await scrollToBottom();
    await settle();
    await scrollToBottom(); // page 1 of feed a in flight

    const renders: number[] = [];
    const observer = new MutationObserver(() => renders.push(ids()));
    observer.observe(document.body, { childList: true, subtree: true });
    rerender(<Feed feedId="b" />);
    observer.disconnect();

    expect(renders.every((count) => count === 0)).toBe(true);
    expect(fetchPage.mock.calls[1][1]?.aborted).toBe(true);

    await scrollToBottom();
    await settle(1000);
    expect(ids()).toBe(20);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("aborts the pending request on unmount without errors", async () => {
    const consoleError = vi.spyOn(console, "error");
    const { unmount } = render(<Feed feedId="a" />);
    await scrollToBottom();
    const signal = fetchPage.mock.calls[0][1];

    unmount();
    await settle(1000);

    expect(signal?.aborted).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("works under StrictMode's double mount", async () => {
    sentinelTop = 0;
    render(
      <StrictMode>
        <Feed feedId="a" />
      </StrictMode>,
    );
    for (let page = 0; page < 6; page++) await settle();

    expect(ids()).toBe(100);
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("errors", () => {
  it("shows a real failure, and retrying recovers and clears it", async () => {
    fetchPage.mockRejectedValueOnce(new Error("boom"));
    render(<Feed feedId="a" />);
    await scrollToBottom();
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent("boom");
    expect(screen.queryByRole("status")).toBeNull();

    await act(async () => screen.getByRole("button", { name: "Retry" }).click());
    await settle();

    expect(ids()).toBe(20);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows something for a rejection that isn't an Error", async () => {
    fetchPage.mockRejectedValueOnce("offline");
    render(<Feed feedId="a" />);
    await scrollToBottom();
    await settle();

    expect(screen.getByRole("alert")).toHaveTextContent("offline");
  });

  it("ignores a page that resolves after its request was aborted", async () => {
    let resolveLate!: (page: api.Page) => void;
    fetchPage.mockImplementationOnce(
      () => new Promise((resolve) => (resolveLate = resolve)),
    );
    const { rerender } = render(<Feed feedId="a" />);
    await scrollToBottom();
    rerender(<Feed feedId="b" />);

    await act(async () =>
      resolveLate({ items: [{ id: 999, title: "from feed a" }], nextCursor: 1 }),
    );

    expect(screen.queryByText("from feed a")).toBeNull();
  });
});
