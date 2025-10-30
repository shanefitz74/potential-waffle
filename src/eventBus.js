export function createEventBus() {
  const listeners = new Map();
  const history = [];

  return {
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    once(event, handler) {
      const off = this.on(event, (...args) => {
        off();
        handler(...args);
      });
      return off;
    },
    emit(event, payload) {
      history.push({ event, payload, timestamp: Date.now() });
      listeners.get(event)?.forEach((handler) => handler(payload));
    },
    get events() {
      return history;
    },
    clear() {
      listeners.clear();
      history.length = 0;
    },
  };
}
