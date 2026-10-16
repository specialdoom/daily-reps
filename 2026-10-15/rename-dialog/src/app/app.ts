import { Component, signal, viewChild } from '@angular/core';
import { RenameDialog } from './rename-dialog';

@Component({
  selector: 'app-root',
  imports: [RenameDialog],
  template: `
    <h1>Files</h1>
    <ul>
      @for (name of files(); track $index) {
        <li>
          {{ name }}
          <button type="button" (click)="rename($index)">Rename</button>
        </li>
      }
    </ul>
    <app-rename-dialog />
  `,
  styles: `
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      padding: 1rem;
    }
    li {
      margin: 0.5rem 0;
    }
  `,
})
export class App {
  private readonly dialog = viewChild.required(RenameDialog);
  protected readonly files = signal(['report.pdf', 'photo.png', 'notes.txt']);

  protected async rename(index: number): Promise<void> {
    const next = await this.dialog().open(this.files()[index]);
    if (next === null) return;
    this.files.update((all) => all.map((n, i) => (i === index ? next : n)));
  }
}
