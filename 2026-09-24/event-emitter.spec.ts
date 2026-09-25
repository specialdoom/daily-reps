import { describe, expect, it } from "vitest";
import { EventEmitter } from "./event-emitter.js";

interface TestEvents {
  userLogin: { userId: string; timestamp: number };
  themeChange: "light" | "dark";
  ping: void;
}

describe("EventEmitter", () => {
  it("calls a listener with the emitted payload", () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();
    const subscription = emitter.on("userLogin", listener);

    emitter.emit("userLogin", { userId: "usr_1", timestamp: 1000 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      userId: "usr_1",
      timestamp: 1000,
    });

    subscription.unsubscribe();
  });

  it("calls multiple listeners in registration order", () => {
    const emitter = new EventEmitter<TestEvents>();
    const calls: string[] = [];

    const first = emitter.on("themeChange", () => calls.push("first"));
    const second = emitter.on("themeChange", () => calls.push("second"));
    const third = emitter.on("themeChange", () => calls.push("third"));

    emitter.emit("themeChange", "dark");

    expect(calls).toEqual(["first", "second", "third"]);

    first.unsubscribe();
    second.unsubscribe();
    third.unsubscribe();
  });

  it("removes only the unsubscribed listener", () => {
    const emitter = new EventEmitter<TestEvents>();
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    const subscriptionA = emitter.on("themeChange", listenerA);
    const subscriptionB = emitter.on("themeChange", listenerB);

    subscriptionA.unsubscribe();
    emitter.emit("themeChange", "dark");

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledTimes(1);

    subscriptionA.unsubscribe();
    emitter.emit("themeChange", "light");

    expect(listenerA).not.toHaveBeenCalled();
    expect(listenerB).toHaveBeenCalledTimes(2);

    subscriptionB.unsubscribe();
  });

  it("supports multiple subscriptions of the same callback independently", () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();

    const firstSubscription = emitter.on("ping", listener);
    const secondSubscription = emitter.on("ping", listener);

    firstSubscription.unsubscribe();
    emitter.emit("ping", undefined);

    expect(listener).toHaveBeenCalledTimes(1);

    secondSubscription.unsubscribe();
  });

  it("does not throw when emitting an event with no listeners", () => {
    const emitter = new EventEmitter<TestEvents>();

    expect(() => emitter.emit("ping", undefined)).not.toThrow();
  });

  it("executes a once listener only once", () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();

    emitter.once("ping", listener);

    emitter.emit("ping", undefined);
    emitter.emit("ping", undefined);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(undefined);
  });

  it("allows a once listener to be unsubscribed before it fires", () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener = vi.fn();
    const subscription = emitter.once("ping", listener);

    subscription?.unsubscribe?.();
    emitter.emit("ping", undefined);

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not call a listener removed before its turn during emission", () => {
    const emitter = new EventEmitter<TestEvents>();
    const calls: string[] = [];
    let listenerBSubscription: { unsubscribe(): void };

    const listenerA = emitter.on("ping", () => {
      calls.push("A");
      listenerBSubscription.unsubscribe();
    });

    listenerBSubscription = emitter.on("ping", () => {
      calls.push("B");
    });

    const listenerC = emitter.on("ping", () => {
      calls.push("C");
    });

    emitter.emit("ping", undefined);

    expect(calls).toEqual(["A", "C"]);

    listenerA.unsubscribe();
    listenerC.unsubscribe();
  });

  it("continues notifying listeners when an earlier listener throws", () => {
    const emitter = new EventEmitter<TestEvents>();
    const laterListener = vi.fn();

    emitter.on("ping", () => {
      throw new Error("Crash");
    });
    emitter.on("ping", laterListener);

    expect(() => emitter.emit("ping", undefined)).not.toThrow();
    expect(laterListener).toHaveBeenCalledTimes(1);
  });
});
