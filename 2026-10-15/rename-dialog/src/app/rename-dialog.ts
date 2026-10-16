import { Component, ElementRef, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-rename-dialog',
  template: `
    <dialog #dlg aria-labelledby="rename-title" closedBy="any">
      <form method="dialog">
        <h2 id="rename-title">Rename file</h2>
        <label>
          Name
          <input #input name="name" required [value]="initial()" />
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
    dialog {
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.4);
    }
    label {
      display: grid;
      gap: 0.25rem;
    }
    .warn {
      color: #b00020;
      min-height: 1.25em;
      margin: 0.5rem 0;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
  `,
})
export class RenameDialog {
  protected readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  protected readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected readonly initial = signal('');
  protected readonly warning = signal('');
  protected resolver: ((value: string | PromiseLike<string | null> | null) => void) | undefined;

  ngOnInit() {
    this.dlg().nativeElement.addEventListener('cancel', (event) => {
      const inputValue = this.inputElement().nativeElement.value;
      if (this.initial() !== inputValue && this.warning() === '') {
        event.preventDefault();
        this.warning.set('Discard changes? Press Esc again.');
      }
    });
    this.dlg().nativeElement.addEventListener('close', () => {
      const inputValue = this.inputElement().nativeElement.value;
      const dialogReturnValue = this.dlg().nativeElement.returnValue;

      if (dialogReturnValue === 'save') {
        this.resolver?.(inputValue.trim());
      } else if (dialogReturnValue === 'cancel' || dialogReturnValue === '') {
        this.initial.set('');
        this.warning.set('');
        this.resolver?.(null);
      }

      this.resolver = undefined;
    });
  }

  /**
   * Opens the dialog pre-filled with `current`.
   * Resolves with the new name on Save, or `null` if the user dismissed it.
   */
  open(current: string): Promise<string | null> {
    this.initial.set(current);
    this.warning.set('');
    this.dlg().nativeElement.returnValue = '';

    this.dlg().nativeElement.showModal();

    if (this?.resolver) this?.resolver(null);

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }
}
