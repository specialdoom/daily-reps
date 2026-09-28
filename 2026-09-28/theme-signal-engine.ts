type Tokens = {
  [key: string]: string | Tokens;
};

type FlattenTokens = Map<string, string>;

type Listener = (token: string, value: string) => void;

export function createTokenEngine(initialTokens: Tokens) {
  let listeners: Listener[] = [];
  let tokens: FlattenTokens = flatten(initialTokens);
  let pending: Map<string, string> = new Map();
  const elementsWithTheme = new Set<HTMLElement>();
  let animationFrameId: number | undefined;

  function setToken(path: string, value: string) {
    const cssPath = parsePath(path);
    tokens.set(cssPath, value);

    if (pending.size === 0 && typeof window !== "undefined") {
      animationFrameId = requestAnimationFrame(flush);
    }

    pending.set(cssPath, value);

    listeners.forEach((listener) => {
      listener(path, value);
    });
  }

  function flush() {
    pending.forEach((value, key, _map) => {
      elementsWithTheme.forEach((element) => {
        element.style.setProperty(key, value);
      });
    });

    pending.clear();
  }

  function subscribe(listener: Listener) {
    listeners.push(listener);

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function applyTheme(targetElement?: HTMLElement) {
    const element = targetElement ?? document.documentElement;

    elementsWithTheme.add(element);

    tokens.forEach((value, key, _map) => {
      if (element.style.getPropertyValue(key) !== value) {
        element.style.setProperty(key, value);
      }
    });
  }

  function flatten(
    tokens: Tokens,
    initialPath: string = "",
    map: Map<string, string> = new Map(),
  ) {
    const result = map;

    for (const tokenKey of Object.keys(tokens)) {
      const path =
        initialPath === "" ? `--${tokenKey}` : `${initialPath}-${tokenKey}`;
      const value = tokens[tokenKey];
      if (!isObject(value)) {
        result.set(path, value as string);
      } else {
        flatten(value as Tokens, path, result);
      }
    }

    return result;
  }

  function parsePath(path: string) {
    return `--${path.replaceAll(".", "-")}`;
  }

  function isObject(tokens: Tokens | string) {
    return tokens.constructor === Object;
  }

  function toCssString(selector: string = ":root") {
    let string = "";
    tokens.forEach((value, key, _map) => {
      string += `${key}: ${value}; \n`;
    });
    return `${selector} \{${string} \}`;
  }

  function destroy() {
    if (animationFrameId && typeof window !== "undefined")
      cancelAnimationFrame(animationFrameId);
    listeners = [];
    tokens.forEach((_value, key, _map) => {
      elementsWithTheme.forEach((element) => {
        element.style.removeProperty(key);
      });
    });
    tokens.clear();
    pending.clear();
    elementsWithTheme.clear();
  }

  return {
    setToken,
    subscribe,
    applyTheme,
    toCssString,
    destroy,
  };
}

const tokens = {
  colors: { brand: { primary: "#3b82f6", secondary: "#111" } },
  spacing: { sm: "4px" },
};
