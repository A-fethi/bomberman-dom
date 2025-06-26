import { effect } from './reactivity.js';
import { patch } from './dom.js';

/**
 * Creates a virtual DOM node (Vnode) representation.
 *
 * @param {string} tag - The HTML tag name for the virtual node (e.g., 'div', 'span').
 * @param {Object} [attrs={}] - An object representing the attributes/properties of the node.
 * @param {Array|any} [children=[]] - The child nodes or content of the virtual node. Can be a single child or an array of children.
 * @returns {Object} The virtual node object with tag, attrs, children (flattened array), and hooks.
 */
export function Vnode(tag, attrs = {}, children = []) {
  return {
    tag,
    attrs,
    children: Array.isArray(children) ? children.flat() : [children],
    hooks: {}
  };
}

/**
 * Renders a component into a specified container and updates it reactively.
 *
 * @param {Function} component - A function that returns the component to render.
 * @param {HTMLElement} container - The DOM element to render the component into.
 */
export function render(component, container) {
  if (!container) return;
  let currentDOM = null;
  effect(() => {
    currentDOM = patch(container, currentDOM, component());
  });
} 