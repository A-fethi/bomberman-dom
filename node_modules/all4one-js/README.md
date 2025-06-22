# Reactive Mini-Framework Documentation

## Overview

This is a minimal reactive UI framework built for learning and experimentation. It includes:

* Virtual DOM diffing with key-based reconciliation
* Reactive state system with dependency tracking
* Batched updates to minimize re-renders
* Component-based architecture using plain functions
* Simple hash-based router
* DOM hooks for lifecycle logic

It is implemented as a single JavaScript module and designed for clarity and extensibility.

---

## How the Framework Works

The core ideas are:

1. **Reactivity:** `createState` allows state to be stored in closures. When accessed inside an `effect`, it registers dependencies that trigger rerenders when changed.
2. **Virtual DOM:** Views return `Vnode` trees. The `patch` function compares old and new trees and updates the real DOM efficiently.
3. **Components:** Are just functions that return `Vnode` trees. They rerun when state inside them changes.
4. **Routing:** The hash-based `startRouter` listens for changes in `location.hash` and renders the appropriate component.
5. **Batching:** Multiple state updates inside a `batch` are processed together, causing a single update.

---
## Installing 
* ``` npm install zonejs ```

---

## Core API

### `Vnode(tag, attrs, children)`

Creates a virtual DOM node. `tag` can be a string (e.g., `'div'`) or a component function.

**Parameters:**

* `tag`: HTML tag name or function component
* `attrs`: Object of attributes (supports camelCase event handlers, `ref`, `value`, `checked`, etc.)
* `children`: Single or array of child nodes (can be text or other vnodes)

**Example:**

```js
// Create an element with attributes and children
Vnode('div', { class: 'box' }, [
  Vnode('h1', {}, 'Hello World'),
  Vnode('button', { onClick: () => alert('Clicked!') }, 'Click Me')
]);
```

### Nesting Elements

You can nest `Vnode` calls to build element trees:

```js
Vnode('ul', {}, [
  Vnode('li', {}, 'Item 1'),
  Vnode('li', {}, 'Item 2')
]);
```

---

### `render(component, container)`

Renders a reactive component to a DOM container and keeps it in sync.

**Example:**

```js
render(App, document.getElementById('root'));
```

---

## Reactivity System

### `createState(initial)`

Creates a reactive state value.

**Returns:** `[get, set]`

**Example:**

```js
const [getCount, setCount] = createState(0);

setCount(getCount() + 1);
```

### `effect(fn)`

Tracks dependencies inside `fn`. It will rerun whenever a used state changes.

**Example:**

```js
effect(() => {
  console.log("Count:", getCount());
});
```

### `batch(fn)`

Combines multiple `set` calls into one render/update cycle.

**Example:**

```js
batch(() => {
  setA(1);
  setB(2);
}); // Only one re-render
```

---

## Virtual DOM & Patching

This framework performs efficient DOM updates via `patch()`:

* Text nodes are compared directly
* Attributes are diffed and updated minimally
* Children are reconciled with optional `key` support
* Component functions are recursively resolved

### Keyed Children

Use `key` in attrs for list items to help reorder instead of replace.

```js
items.map(item => 
  Vnode('li', { key: item.id }, item.text)
);
```

> ⚠️ Always use `key` for dynamic lists to avoid unwanted DOM replacement.

---

## Event Handling

Event listeners use camelCase syntax (like in vanilla DOM):

```js
Vnode('button', {
  onClick: () => alert('Button clicked!')
}, 'Click Me');
```

Supported events include:

* `onClick`, `onInput`, `onChange`
* `onKeydown`, `onBlur`, `onDblclick`
* Any standard DOM event

---

## Form Binding

You can bind form fields to state using `value`, `checked`, and event handlers.

```js
const [getText, setText] = createState('');

Vnode('input', {
  type: 'text',
  value: getText(),
  onInput: e => setText(e.target.value)
});
```

Checkboxes work the same way with `checked`:

```js
const [getChecked, setChecked] = createState(false);

Vnode('input', {
  type: 'checkbox',
  checked: getChecked(),
  onChange: e => setChecked(e.target.checked)
});
```

---

## Lifecycle Hooks

You can attach lifecycle events via the `hooks` property in a Vnode.

* `onMount(el)`: Called after the element is added to the DOM

**Example:**

```js
Vnode('input', {}, '', {
  hooks: {
    onMount: el => el.focus()
  }
});
```

> `onUnmount` is not currently supported.

---

## Routing

### `startRouter(routes, container, fallback)`

Sets up hash-based routing that watches `window.location.hash`.

**Parameters:**

* `routes`: `{ '/path': ComponentFn }`
* `container`: DOM node to mount into
* `fallback`: optional view to show if route not found

**Example:**

```js
startRouter({
  '/': Home,
  '/about': AboutPage
}, document.getElementById('app'));
```

When the URL hash changes (e.g., `#about`), the appropriate view is rendered.

---

## Performance Features

* **Batched State Updates:** Use `batch()` to reduce render frequency.
* **Keyed Reconciliation:** Use `key` in lists to preserve order and identity.
* **Efficient Attribute Diffing:** Only changed attributes are updated.
* **Text Node Optimization:** Text nodes are not replaced unless their content changes.



---

## Contributors

- [@mzakri](https://github.com/DevZAKRI) – Creator and maintainer
- [@msalmi](https://github.com/Azalea-u) – Creator and maintainer
- [@afethi](https://github.com/A-fethi) – Creator and maintainer
- [@aelabsi](https://github.com/maverick-node) – Creator and maintainer

Contributions, suggestions, and issues are welcome! Please Contact us on GitHub.