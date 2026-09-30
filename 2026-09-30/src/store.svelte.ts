import { SvelteMap } from "svelte/reactivity";

type ListItemId = string | number;

type ListItem<T> = {
  id: ListItemId;
  data: T;
  isSelected: boolean;
};

type ListItemPredicateFn<T> = (value: ListItem<T>) => boolean;

export function createListStore<T>() {
  let counter = 0;

  const list = new SvelteMap<ListItemId, ListItem<T>>();

  function addItem(data: T) {
    const item = $state({
      id: counter,
      data,
      isSelected: false,
    });
    list.set(counter, item);

    return counter++;
  }

  function removeItem(id: ListItemId) {
    list.delete(id);
  }

  function setIsSelected(id: ListItemId, isSelected: boolean) {
    const item = list.get(id);
    if (!item) return;
    item.isSelected = isSelected;
  }

  function updateField<K extends keyof T>(
    id: ListItemId,
    field: K,
    value: T[K],
  ) {
    const listItem = list.get(id);
    if (!listItem) return;

    listItem.data[field] = value;
  }

  function derivedFilter(predicate: ListItemPredicateFn<T>) {
    const filtered = $derived([...list.values()].filter(predicate));

    return {
      get current() {
        return filtered;
      },
    };
  }

  function getItem(id: ListItemId): ListItem<T> | null {
    const item = list.get(id);
    if (!item) return null;
    return item;
  }

  return {
    get state() {
      return [...list.values()];
    },
    addItem,
    removeItem,
    updateField,
    derivedFilter,
    setIsSelected,
    getItem,
  };
}
