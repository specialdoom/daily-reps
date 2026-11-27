import { reactive } from "vue";

export type ToastKind = "success" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextId = 1;
export const toasts = reactive<Toast[]>([]);

/** Shows a toast and removes it after `ms`. */
export function pushToast(kind: ToastKind, message: string, ms = 4000): void {
  const id = nextId++;
  toasts.push({ id, kind, message });
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id);
    if (i !== -1) toasts.splice(i, 1);
  }, ms);
}
