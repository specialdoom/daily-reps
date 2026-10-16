import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-rename-dialog',
  template: `
    <dialog #dlg aria-labelledby="rename-title" closedBy="any">
      <form method="dialog">
        <h2 id="rename-title">Rename file</h2>
        <label>
          Name
          <!-- pattern: a whitespace-only name passes \`required\` but trims to '' -->
          <input #input name="name" required pattern=".*\\S.*" title="Name can't be blank" />
        </label>
        <p class="warn" role="alert">{{ warning() }}</p>
        <div class="actions">
          <!-- Not a submit button: Enter submits via the form's first submit button,
               which must be Save. close('cancel') still goes through the close event. -->
          <button type="button" (click)="dlg.close('cancel')">Cancel</button>
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
  protected resolver: ((value: string | null) => void) | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.resolver?.(null);
      this.resolver = undefined;
    });
  }

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
      } else {
        this.resolver?.(null);
      }

      this.warning.set('');
      this.resolver = undefined;
    });
  }

  /**
   * Opens the dialog pre-filled with `current`.
   * Resolves with the new name on Save, or `null` if the user dismissed it.
   */
  open(current: string): Promise<string | null> {
    this.resolver?.(null);

    this.initial.set(current);
    this.warning.set('');
    this.dlg().nativeElement.returnValue = '';
    // Set the DOM value directly: a [value] binding only lands on the next render
    // (after showModal() has focused the input) and skips re-applying an unchanged name.
    this.inputElement().nativeElement.value = current;

    this.dlg().nativeElement.showModal();

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }
}
