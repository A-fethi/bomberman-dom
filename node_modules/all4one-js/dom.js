/**
 * Patches the DOM by updating, replacing, or creating nodes based on the differences
 * between the old virtual node and the new virtual node.
 *
 * @param {Node} parent - The parent DOM node to patch into.
 * @param {*} oldNode - The previous virtual node or DOM node.
 * @param {*} newNode - The new virtual node to render.
 * @returns {Node|null} The updated or newly created DOM node, or null if no parent is provided.
 */
export function patch(parent, oldNode, newNode) {
  if (!parent) return null;

  // empty/array nodes handling ajmi
  if (newNode == null) return document.createTextNode('');
  if (Array.isArray(newNode)) return patchFragment(parent, oldNode, newNode);

  // Handle text nodes
  if (typeof newNode !== 'object') return patchText(parent, oldNode, newNode);

  // Handle component nodes
  if (typeof newNode.tag === 'function') {
    const componentVNode = newNode.tag(newNode.attrs);
    componentVNode.hooks = newNode.hooks;
    return patch(parent, oldNode, componentVNode);
  }

  // Handle element replacement
  if (!oldNode || shouldReplace(oldNode, newNode)) {
    return replaceNode(parent, oldNode, newNode);
  }

  // Update existing element
  updateElement(oldNode, newNode);
  return oldNode;
}

/**
 * Creates a document fragment from a list of child virtual nodes and returns it.
 *
 * @param {Node} parent - The parent DOM node to which the fragment may eventually be appended.
 * @param {Object|null} oldNode - The previous virtual node, or null if there is none.
 * @param {Array<Object>} children - An array of virtual child nodes to be patched and appended to the fragment.
 * @returns {DocumentFragment} A document fragment containing the patched child nodes.
 */
function patchFragment(parent, oldNode, children) {
  const fragment = document.createDocumentFragment();
  children
    .filter(child => child !== false && child !== null && child !== undefined)
    .forEach(child => fragment.appendChild(patch(parent, null, child)));
  return fragment;
}

/**
 * Updates or creates a text node within a parent DOM element.
 *
 * If the existing text node's value matches the new text, it is returned as-is.
 * Otherwise, a new text node is created and either replaces the old node or is appended to the parent.
 *
 * @param {Node} parent - The parent DOM node to contain the text node.
 * @param {Node|null} oldNode - The existing text node to potentially update or replace.
 * @param {string|number} text - The new text content to set.
 * @returns {Node} The updated or newly created text node.
 */
function patchText(parent, oldNode, text) {
  if (oldNode?.nodeValue === String(text)) return oldNode;
  const newText = document.createTextNode(String(text));
  if (oldNode && parent.contains(oldNode)) parent.replaceChild(newText, oldNode);
  else parent.appendChild(newText);
  return newText;
}

/**
 * Determines whether an old DOM node should be replaced by a new node.
 *
 * @param {Node} oldNode - The existing DOM node to compare.
 * @param {Object|string|number} newNode - The new node representation, which can be a virtual DOM object, string, or number.
 * @returns {boolean} Returns true if the old node should be replaced by the new node, otherwise false.
 */
function shouldReplace(oldNode, newNode) {
  const isOldText = oldNode.nodeType === 3;
  const isNewText = typeof newNode === 'string' || typeof newNode === 'number';
  if (isOldText !== isNewText) return true;
  return !isNewText && oldNode.tagName.toLowerCase() !== newNode.tag;
}

/**
 * Replaces an existing DOM node with a new node, or appends the new node if the old node does not exist.
 *
 * @param {HTMLElement} parent - The parent DOM element containing the node to be replaced.
 * @param {HTMLElement|null} oldNode - The existing DOM node to be replaced. If null or not found, newNode is appended.
 * @param {Object} newNode - The virtual node or data used to create the new DOM element.
 * @returns {HTMLElement} The newly created and inserted DOM element.
 */
function replaceNode(parent, oldNode, newNode) {
  const newDOM = createElement(newNode);
  if (oldNode && parent.contains(oldNode)) parent.replaceChild(newDOM, oldNode);
  else parent.appendChild(newDOM);
  return newDOM;
}

/**
 * Creates a DOM element from a virtual node (vnode).
 *
 * Handles different vnode types:
 * - If vnode is null, returns an empty text node.
 * - If vnode is an array, delegates to patchFragment to handle fragment nodes.
 * - If vnode is a primitive, returns a text node with its string value.
 * - If vnode represents the <body> element, updates and returns the existing document body.
 * - Otherwise, creates a new DOM element, applies hooks and updates its properties.
 *
 * @param {Object|Array|string|number|null} vnode - The virtual node to convert into a DOM element.
 * @returns {Node} The created or updated DOM node.
 */
function createElement(vnode) {
  if (vnode == null) return document.createTextNode('');
  if (Array.isArray(vnode)) return patchFragment(null, null, vnode.filter(child => child !== false && child !== null && child !== undefined));
  if (typeof vnode !== 'object') return document.createTextNode(String(vnode));

  // Special handling for body element
  if (vnode.tag === 'body') {
    const existingBody = document.body;
    if (existingBody) {
      if (vnode.hooks.onMount) vnode.hooks.onMount(existingBody);
      updateElement(existingBody, vnode);
      return existingBody;
    }
  }

  const el = document.createElement(vnode.tag);
  if (vnode.hooks.onMount) vnode.hooks.onMount(el);
  updateElement(el, vnode);
  return el;
}

/**
 * Updates a DOM element's attributes and children based on the provided virtual node (vnode).
 *
 * @param {HTMLElement} el - The DOM element to update.
 * @param {Object} vnode - The virtual node containing attributes and children.
 * @param {Object} [vnode.attrs] - Attributes to set on the element.
 * @param {Object[]} [vnode.children] - Child virtual nodes to reconcile.
 *
 * @example
 * updateElement(document.getElementById('myDiv'), {
 *   attrs: { id: 'myDiv', class: 'active', onClick: () => alert('Clicked!') },
 *   children: []
 * });
 */
function updateElement(el, vnode) {
  if (!vnode.attrs) return;

  for (const [key, value] of Object.entries(vnode.attrs)) {
    if (key === 'ref') value(el);
    else if (key === 'focus' && value === true) {
      requestAnimationFrame(() => el.focus());
    }
    else if (key.startsWith('on') && typeof value === 'function') el[key.toLowerCase()] = value;
    else if (key === 'value' && el instanceof HTMLInputElement) el.value = value;
    else if (key === 'checked' && el instanceof HTMLInputElement) el.checked = value;
    else if (value === true) el.setAttribute(key, '');
    else if (value === false) el.removeAttribute(key);
    else if (value !== false && value != null) el.setAttribute(key, value);
  }

  reconcileChildren(el, vnode.children || []);
}

/**
 * Reconciles the children of a DOM element with a new set of virtual children.
 * Efficiently updates, reorders, inserts, or removes DOM nodes to match the desired children.
 *
 * @param {Element} el - The parent DOM element whose children will be reconciled.
 * @param {Array} children - The new set of virtual children to reconcile with the DOM.
 */
function reconcileChildren(el, children) {
  const oldChildren = Array.from(el.childNodes);
  const keyedOld = getKeyedNodes(oldChildren);
  const newOrder = [];

  children
    .filter(child => child !== false && child !== null && child !== undefined)
    .forEach((child, i) => {
      const key = typeof child === 'object' ? child.attrs?.key : null;
      const node = key != null && keyedOld.has(key)
        ? keyedOld.get(key)
        : oldChildren[i];

      newOrder.push(patch(el, node, child));
    });

  newOrder.forEach((node, i) => {
    if (el.childNodes[i] !== node) {
      el.insertBefore(node, el.childNodes[i] || null);
    }
  });

  while (el.childNodes.length > newOrder.length) {
    el.removeChild(el.lastChild);
  }
}

/**
 * Creates a Map of DOM element nodes keyed by their 'key' attribute.
 *
 * Iterates over the provided array-like collection of nodes, and for each element node (nodeType === 1)
 * that has a 'key' attribute, adds an entry to the returned Map where the key is the attribute value
 * and the value is the node itself.
 *
 * @param {NodeList | Array<Node>} nodes - A collection of DOM nodes to process.
 * @returns {Map<string, Element>} A Map where each entry's key is the value of the 'key' attribute and the value is the corresponding DOM element.
 */
function getKeyedNodes(nodes) {
  const keyed = new Map();
  nodes.forEach(node => {
    if (node.nodeType === 1) {
      const key = node.getAttribute('key');
      if (key != null) keyed.set(key, node);
    }
  });
  return keyed;
}