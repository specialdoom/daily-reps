const list = document.querySelector<HTMLUListElement>("#list")!;
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const dialog = document.querySelector<HTMLDialogElement>("#confirm")!;
const nameEl = document.querySelector<HTMLElement>("#confirm-name")!;

// TODO: open the dialog for the clicked file and delete it only on a confirmed answer.
list.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".delete");
  if (!button) return;
  nameEl.textContent = button.dataset.name ?? "";
  button.closest("li")?.remove(); // starter behaviour: deletes immediately, no confirmation
  statusEl.textContent = `Deleted ${button.dataset.name}`;
  void dialog;
});
