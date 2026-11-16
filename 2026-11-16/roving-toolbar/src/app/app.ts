import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Toolbar, ToolbarItem } from './toolbar';

@Component({
  selector: 'app-root',
  imports: [Toolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Editor</h1>
    <button type="button" (click)="toggleLink()">
      {{ linkEnabled() ? 'Disable' : 'Enable' }} "Link"
    </button>
    <button type="button" (click)="removeLast()">Remove last item</button>
    <p>
      <label for="before">Title:</label>
      <input id="before" value="Draft" />
    </p>
    <app-toolbar label="Text formatting" [items]="items()" [pressed]="pressed()" (toggle)="onToggle($event)" />
    <p>
      <label for="after">Notes:</label>
      <input id="after" />
    </p>
  `,
})
export class App {
  protected readonly linkEnabled = signal(true);
  protected readonly pressed = signal<string[]>([]);
  protected readonly removed = signal(false);

  protected readonly items = (): ToolbarItem[] => {
    const all: ToolbarItem[] = [
      { id: 'bold', label: 'Bold' },
      { id: 'italic', label: 'Italic' },
      { id: 'underline', label: 'Underline', disabled: true },
      { id: 'link', label: 'Link', disabled: !this.linkEnabled() },
      { id: 'code', label: 'Code' },
    ];
    return this.removed() ? all.slice(0, -1) : all;
  };

  protected onToggle(id: string): void {
    this.pressed.update((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  protected toggleLink(): void {
    this.linkEnabled.update((v) => !v);
  }
  protected removeLast(): void {
    this.removed.set(true);
  }
}
