import { createState, effect } from './reactivity.js';
import { patch } from './dom.js';
import { Vnode } from './core.js';

/**
 * Initializes and starts a simple hash-based router.
 *
 * @param {Object.<string, Function>} routes - An object mapping route paths to view functions.
 * @param {HTMLElement} container - The DOM element where views will be rendered.
 * @param {Function} [fallback] - Optional. A function that returns a Vnode for unmatched routes (defaults to a 404 page).
 *
 * @example
 * startRouter({
 *   '/': HomeView,
 *   '/about': AboutView
 * }, document.getElementById('app'));
 */
export function startRouter(routes, container, fallback = () => 
  Vnode('div', { class: "error-404-container" }, [
    Vnode('div', { class: "error-404-title" }, '404'),
    Vnode('div', { class: "error-404-message" }, 'Page Not Found'),
    Vnode('a', { class: "error-404-link", href: "#/" }, 'Go Home')
  ])
) {
  const [getHash, setHash] = createState(window.location.hash);
  let currentDOM = null;
  
  window.addEventListener('hashchange', () => setHash(window.location.hash));
  
  effect(() => {
 
    
    const path = getHash().slice(1) || '/';

    
    const view = routes[path] || fallback;
    
    
    currentDOM = patch(container, currentDOM, view);
  });
}