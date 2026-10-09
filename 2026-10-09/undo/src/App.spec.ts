import { fireEvent, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App.svelte";

const button = (name: string) => screen.getByRole("button", { name });
const titles = () => screen.queryAllByRole("textbox", { name: "Card title" });

describe("App", () => {
  it("add card, undo: the card disappears and Redo becomes enabled", async () => {
    const user = userEvent.setup();
    render(App);
    expect(button("Undo")).toBeDisabled();
    expect(button("Redo")).toBeDisabled();

    await user.click(button("Add card"));
    expect(titles()).toHaveLength(2);
    await user.click(button("Undo"));
    expect(titles()).toHaveLength(1);
    expect(button("Redo")).toBeEnabled();
    expect(button("Undo")).toBeDisabled();
  });

  it("rename the board, blur, undo: the previous name is back in the input", async () => {
    const user = userEvent.setup();
    render(App);
    const name = screen.getByRole("textbox", { name: "Board name" });

    await user.clear(name);
    await user.type(name, "Release");
    expect(button("Undo")).toBeDisabled(); // no commit per keystroke
    await user.tab();
    expect(button("Undo")).toBeEnabled();

    await user.click(button("Undo"));
    expect(name).toHaveProperty("value", "Sprint");
    await user.click(button("Redo"));
    expect(name).toHaveProperty("value", "Release");
  });

  it("after undoing, committing a title edit disables Redo", async () => {
    const user = userEvent.setup();
    render(App);
    await user.click(button("Add card"));
    await user.click(button("Undo"));
    expect(button("Redo")).toBeEnabled();

    const [title] = titles();
    await user.type(title, "!");
    await fireEvent.change(title);
    expect(button("Redo")).toBeDisabled();
  });

  it("mutating the restored board leaves older entries intact", async () => {
    const user = userEvent.setup();
    render(App);
    await user.click(button("Tag"));
    expect(screen.getByText("qa, new")).toBeTruthy();

    await user.click(button("Undo"));
    expect(screen.getByText("qa")).toBeTruthy();
    // Mutate the restored state, then walk the history.
    await user.click(button("Add card"));
    await user.click(screen.getAllByRole("button", { name: "Tag" })[0]);
    await user.click(button("Undo"));
    await user.click(button("Undo"));
    expect(titles()).toHaveLength(1);
    expect(screen.getByText("qa")).toBeTruthy();
    await user.click(button("Redo"));
    expect(titles()).toHaveLength(2);
    expect(screen.getAllByText("qa")).toHaveLength(1);
  });

  it("after 60 commits only the last 50 states are reachable", async () => {
    render(App);
    for (let i = 0; i < 60; i++) await fireEvent.click(button("Add card"));
    expect(titles()).toHaveLength(61);

    let undos = 0;
    while (!(button("Undo") as HTMLButtonElement).disabled) {
      await fireEvent.click(button("Undo"));
      undos++;
    }
    expect(undos).toBe(49);
    expect(titles()).toHaveLength(12);
  });
});
