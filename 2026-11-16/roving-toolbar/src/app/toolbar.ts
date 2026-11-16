import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ToolbarItem {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="toolbar" [attr.aria-label]="label()">
      @for (item of items(); track item.id) {
        <button
          type="button"
          [disabled]="item.disabled"
          [attr.aria-pressed]="pressed().includes(item.id)"
          (click)="toggle.emit(item.id)"
        >
          {{ item.label }}
        </button>
      }
    </div>
  `,
})
export class Toolbar {
  readonly label = input.required<string>();
  readonly items = input.required<ToolbarItem[]>();
  readonly pressed = input<string[]>([]);
  readonly toggle = output<string>();

  // TODO: roving tabindex + arrow-key navigation
  // Right now every enabled button is its own Tab stop.
}
