export function createHistory<T extends object>(
  state: T,
  options?: { limit?: number }, // default to 50
) {
  const limit = options?.limit ?? 50;
  const history: ReturnType<typeof $state.snapshot>[] = [
    $state.snapshot(state),
  ];
  let index = $state(0);
  let canUndo = $derived(index > 0);
  let canRedo = $derived(index !== history.length - 1);

  function commit() {
    history.splice(index + 1);
    if (history.length === limit) {
      history.shift();
      history.push($state.snapshot(state));
    } else {
      history.push($state.snapshot(state));
      index++;
    }
  }

  function undo() {
    if (index === 0) return;

    index--;
    Object.assign(state, structuredClone(history[index]));
  }

  function redo() {
    if (index === history.length - 1) return;

    index++;
    Object.assign(state, structuredClone(history[index]));
  }

  return {
    commit,
    undo,
    redo,
    get canUndo() {
      return canUndo;
    },
    get canRedo() {
      return canRedo;
    },
  };
}
