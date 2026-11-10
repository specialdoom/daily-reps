const form = document.querySelector<HTMLFormElement>("#signup")!;
const password = document.querySelector<HTMLInputElement>("#password")!;
const confirmInput = document.querySelector<HTMLInputElement>("#confirm")!;
const confirmError = document.querySelector<HTMLElement>("#confirm-error")!;
const statusEl = document.querySelector<HTMLElement>("#status")!;

// Show the browser's validation message next to the field.
function showError(input: HTMLInputElement, target: HTMLElement): void {
  target.textContent = input.validationMessage;
}

confirmInput.addEventListener("blur", () => {
  if (confirmInput.value !== password.value) {
    confirmInput.setCustomValidity("Passwords do not match");
  }
  showError(confirmInput, confirmError);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  statusEl.textContent = "Account created!";
});
