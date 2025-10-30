export function createReplaySystem(game) {
  let recording = false;
  const frames = [];
  let startTime = 0;

  function recordFrame(time) {
    if (!recording) return;
    const snapshot = game.snapshot();
    frames.push({
      time: time - startTime,
      snapshot,
    });
  }

  return {
    start() {
      frames.length = 0;
      startTime = performance.now();
      recording = true;
    },
    stop() {
      recording = false;
    },
    toggle(active) {
      if (typeof active === "boolean") {
        if (active) this.start();
        else this.stop();
        return recording;
      }
      recording = !recording;
      if (recording) {
        this.start();
      }
      return recording;
    },
    recordInput(dir) {
      if (!recording) return;
      frames.push({
        time: performance.now() - startTime,
        input: dir,
      });
    },
    capture(time) {
      recordFrame(time);
    },
    getFrames() {
      return [...frames];
    },
    isRecording() {
      return recording;
    },
  };
}
