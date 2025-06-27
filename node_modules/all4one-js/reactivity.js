let currentEffect = null;
let batchQueue = [];
let isBatching = false;

/**
 * Creates a reactive state with getter and setter functions.
 *
 * @template T
 * @param {T} initial - The initial value of the state.
 * @returns {[() => T, (next: T) => void]} 
 *   A tuple containing:
 *     - get: A function to retrieve the current state value. Registers the current effect as a listener if present.
 *     - set: A function to update the state value. Notifies listeners if the value changes.
 *
 * @example
 * const [getCount, setCount] = createState(0);
 * setCount(1);
 * console.log(getCount()); // 1
 */
export function createState(initial) {
  let state = initial;
  const listeners = new Set();

  const get = () => {
    if (currentEffect) listeners.add(currentEffect);
    return state;
  };

  const set = (next) => {
    if (Object.is(state, next)) return;
    state = next;
    if (isBatching) {
      listeners.forEach(fn => batchQueue.push(fn));
    } else {
      batch(() => listeners.forEach(fn => fn()));
    }
  };

  return [get, set];
}

/**
 * Registers a reactive effect function that will be executed immediately.
 * The effect function will be tracked for dependencies so that it can be re-executed
 * when those dependencies change.
 *
 * @param {Function} fn - The function to run reactively.
 */
export function effect(fn) {
  const execute = () => {
    currentEffect = execute;
    fn();
    currentEffect = null;
  };
  execute();
}

/**
 * Executes the provided function in a batched context, ensuring that any side effects
 * (such as reactive updates) triggered during the execution are queued and only executed once,
 * after the batch completes. If already batching, the function is executed immediately.
 *
 * @param {Function} fn - The function to execute within the batch context.
 */
export function batch(fn) {
  if (isBatching) {
    fn();
    return;
  }
  
  isBatching = true;
  const prevQueue = batchQueue;
  batchQueue = [];
  
  try {
    fn();
  } finally {
    isBatching = false;
    const uniqueEffects = [...new Set(batchQueue)];
    batchQueue = prevQueue;
    uniqueEffects.forEach(effect => effect());
  }
} 