import { TestBed } from '@angular/core/testing';
import { RenameDialog } from './rename-dialog';

/** Esc or light dismiss: a cancelable `cancel`, then close() unless it was prevented. */
function dismiss(dialog: HTMLDialogElement): void {
  if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
}

function setup() {
  const fixture = TestBed.createComponent(RenameDialog);
  fixture.detectChanges();
  const host: HTMLElement = fixture.nativeElement;
  const dialog = host.querySelector('dialog')!;
  const input = host.querySelector('input')!;
  const warning = () => {
    fixture.detectChanges();
    return host.querySelector('.warn')!.textContent!.trim();
  };
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  // Let Angular render after open(), as it would before a real user can type.
  const rendered = () => fixture.whenStable();
  return { fixture, component: fixture.componentInstance, dialog, input, warning, type, rendered };
}

describe('RenameDialog', () => {
  it('opens modally with the input pre-filled synchronously and no warning', () => {
    const { component, dialog, input, warning } = setup();
    void component.open('photo.png');
    expect(dialog.open).toBe(true);
    expect(input.value).toBe('photo.png');
    expect(warning()).toBe('');
  });

  it('resolves with the trimmed input on Save', async () => {
    const { component, dialog, type, rendered } = setup();
    const result = component.open('photo.png');
    await rendered();
    type('  pic.png  ');
    dialog.close('save');
    await expect(result).resolves.toBe('pic.png');
  });

  it('resolves null on Cancel, even after editing', async () => {
    const { component, dialog, type, rendered } = setup();
    const result = component.open('photo.png');
    await rendered();
    type('pic.png');
    dialog.close('cancel');
    await expect(result).resolves.toBeNull();
  });

  it('resolves null on Esc when nothing changed', async () => {
    const { component, dialog, rendered } = setup();
    const result = component.open('photo.png');
    await rendered();
    dismiss(dialog);
    expect(dialog.open).toBe(false);
    await expect(result).resolves.toBeNull();
  });

  it('blocks the first dirty dismissal with a warning, closes on the second', async () => {
    const { component, dialog, type, warning, rendered } = setup();
    const result = component.open('photo.png');
    await rendered();
    type('pic.png');

    dismiss(dialog);
    expect(dialog.open).toBe(true);
    expect(warning()).toBe('Discard changes? Press Esc again.');

    dismiss(dialog);
    expect(dialog.open).toBe(false);
    await expect(result).resolves.toBeNull();
  });

  it('does not treat a stale "save" returnValue as Save on the next Esc', async () => {
    const { component, dialog, type, rendered } = setup();
    const first = component.open('photo.png');
    await rendered();
    type('pic.png');
    dialog.close('save');
    await expect(first).resolves.toBe('pic.png');

    const second = component.open('notes.txt');
    await rendered();
    dismiss(dialog);
    await expect(second).resolves.toBeNull();
  });

  it('re-fills the input when re-opened with the same name after an edit', async () => {
    const { component, dialog, input, type, warning, rendered } = setup();
    const first = component.open('photo.png');
    await rendered();
    type('  photo.png  ');
    dialog.close('save');
    await first;

    const second = component.open('photo.png');
    await rendered();
    expect(input.value).toBe('photo.png');
    dismiss(dialog);
    expect(warning()).toBe('');
    await expect(second).resolves.toBeNull();
  });

  it('settles the previous promise with null when open() is called again', async () => {
    const { component, dialog, type, rendered } = setup();
    const first = component.open('report.pdf');
    const second = component.open('photo.png');
    await rendered();
    await expect(first).resolves.toBeNull();

    type('pic.png');
    dialog.close('save');
    await expect(second).resolves.toBe('pic.png');
  });

  it('resolves null for any other returnValue', async () => {
    const { component, dialog, rendered } = setup();
    const result = component.open('photo.png');
    await rendered();
    dialog.close('something-else');
    await expect(result).resolves.toBeNull();
  });

  it('clears a stale warning when re-opened', async () => {
    const { component, dialog, type, warning, rendered } = setup();
    const first = component.open('photo.png');
    await rendered();
    type('pic.png');
    dismiss(dialog);
    expect(warning()).not.toBe('');
    dismiss(dialog);
    await first;

    void component.open('notes.txt');
    await rendered();
    expect(warning()).toBe('');
  });

  it('resolves null if destroyed while open', async () => {
    const { fixture, component, rendered } = setup();
    const result = component.open('photo.png');
    await rendered();
    fixture.destroy();
    await expect(result).resolves.toBeNull();
  });
});
