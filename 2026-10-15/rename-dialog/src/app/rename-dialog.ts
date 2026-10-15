import { Component, ElementRef, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-rename-dialog',
  template: `
    <dialog #dlg aria-labelledby="rename-title">
      <form method="dialog">
        <h2 id="rename-title">Rename file</h2>
        <label>
          Name
          <input name="name" required [value]="initial()" />
        </label>
        <p class="warn" role="alert">{{ warning() }}</p>
        <div class="actions">
          <button value="cancel" formnovalidate>Cancel</button>
          <button value="save">Save</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    dialog { border: 1px solid #ccc; border-radius: 8px; padding: 1rem 1.25rem; }
    dialog::backdrop { background: rgb(0 0 0 / 0.4); }
    label { display: grid; gap: 0.25rem; }
    .warn { color: #b00020; min-height: 1.25em; margin: 0.5rem 0; }
    .actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  `,
})
export class RenameDialog {
  protected readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  protected readonly initial = signal('');
  protected readonly warning = signal('');

  /**
   * Opens the dialog pre-filled with `current`.
   * Resolves with the new name on Save, or `null` if the user dismissed it.
   */
  open(current: string): Promise<string | null> {
    // TODO
    throw new Error('TODO');
  }
}
