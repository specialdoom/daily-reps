### **Daily Frontend Challenge: CSS Design Tokens & Theme Signal Engine**

#### **Overview**

Building robust design systems requires a tight coupling between CSS Custom Properties (design tokens) and application state. In modern frameworks, changing a theme or visual token should reactively update the DOM via CSS variables while keeping state synchronized across components and micro-frontends without layout thrashing.

Your task is to build a type-safe **Theme & Design Token Engine** in TypeScript that bridges structured design tokens with CSS variable injection, supporting scoped DOM overrides, reactive subscriptions, and theme switching with zero runtime layout thrashing (`requestAnimationFrame` / batching).

---

### **Detailed Requirements**

1. **Token Schema & Type Safety:**
* Define a strongly-typed schema for design tokens (e.g., colors, spacing, typography, elevation).
* The utility should flatten nested token objects into CSS variable names automatically:
* Input: `{ colors: { brand: { primary: '#3b82f6' } } }`
* CSS Variable output: `--colors-brand-primary: #3b82f6;`




2. **Core API Methods:**
* `createTokenEngine(initialTokens, options?)`: Initializes the token store.
* `setToken(path, value)`: Updates a single token value reactively.
* `applyTheme(targetElement?)`: Injects or updates CSS variables on `:root` or a scoped `HTMLElement` (e.g., a specific card or modal container).
* `subscribe(listener)`: Subscribes to token changes.


3. **DOM Performance & Batching:**
* Multiple synchronous calls to `setToken()` or updating multiple tokens at once must **batch** DOM writes into a single `requestAnimationFrame` frame to prevent forced synchronous layouts (layout thrashing).
* Option to generate a static CSS string for Server-Side Rendering (SSR) context to avoid visual FOUC (Flash of Unstyled Content).



---

### **Key Edge Cases & Behavior to Consider**

* **Scoped Themes:** Ensure applying a dark mode or specific high-contrast token set to a child container (`

`) does not pollute or overwrite global `:root` variables.

* **Color Mode Fallbacks:** If a token is accessed prior to DOM mount (e.g., during SSR), guarantee that `getComputedStyle` is not invoked and a clean CSS string fallback is produced.
* **Cleanup:** Provide a `.destroy()` method that removes added inline CSS properties or attached `