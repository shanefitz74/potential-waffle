export function createStateMachine(initialState, transitions) {
  let current = initialState;
  const observers = new Set();

  function canTransition(target) {
    return Boolean(transitions[current]?.includes(target));
  }

  return {
    get state() {
      return current;
    },
    transition(target) {
      if (target === current) return true;
      if (!canTransition(target)) return false;
      const prev = current;
      current = target;
      observers.forEach((observer) => observer({ from: prev, to: target }));
      return true;
    },
    onChange(handler) {
      observers.add(handler);
      return () => observers.delete(handler);
    },
  };
}
