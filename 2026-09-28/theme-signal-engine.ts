type Tokens = {
  [key: string]: string | Tokens;
};

type Listener = (token: string) => void;

export function createTokenEngine(initialTokens: Tokens) {
  let listeners: Listener[] = [];
  let tokens: Tokens = initialTokens;

  function setToken(path: keyof Tokens, value: string) {
    tokens[path] = value;

    listeners.forEach((listener) => {
      listener(value);
    });
  }

  function subscribe(listener: Listener) {
    listeners.push(listener);
  }

  return {
    setToken,
    subscribe,
  };
}

const tokens = {
  colors: { brand: { primary: "#3b82f6", secondary: "#111" } },
  spacing: { sm: "4px" },
};
