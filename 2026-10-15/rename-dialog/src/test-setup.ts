// jsdom has no <dialog> API. This is the subset of the HTML spec the component relies on:
// showModal()/close(result), returnValue, and `close` fired as a queued task.
const proto = HTMLDialogElement.prototype as HTMLDialogElement & { __returnValue?: string };

Object.defineProperty(proto, 'open', {
  configurable: true,
  get(this: HTMLDialogElement) {
    return this.hasAttribute('open');
  },
});

Object.defineProperty(proto, 'returnValue', {
  configurable: true,
  get(this: HTMLDialogElement & { __returnValue?: string }) {
    return this.__returnValue ?? '';
  },
  set(this: HTMLDialogElement & { __returnValue?: string }, value: string) {
    this.__returnValue = String(value);
  },
});

proto.showModal = function (this: HTMLDialogElement) {
  if (this.open) {
    if (this.hasAttribute('data-modal')) return;
    throw new DOMException('Dialog is open but not modal', 'InvalidStateError');
  }
  this.setAttribute('open', '');
  this.setAttribute('data-modal', '');
};

proto.close = function (this: HTMLDialogElement, result?: string) {
  if (!this.open) return;
  this.removeAttribute('open');
  this.removeAttribute('data-modal');
  if (result !== undefined) this.returnValue = result;
  setTimeout(() => this.dispatchEvent(new Event('close')));
};
