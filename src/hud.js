import { formatTime } from "./utils.js";

export function createHud({
  scoreEl,
  highScoreEl,
  livesEl,
  levelEl,
  modeEl,
  frightenedEl,
  comboEl,
  fruitEl,
  stateEl,
  ghostMoodsEl,
  debugToggle,
  themeSelect,
  replayToggle,
  audioToggle,
  audioVolume,
  memoryOverlay,
  memoryTitle,
  memoryCaption,
  memoryContinue,
}) {
  function safeText(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  const api = {
    updateScore(score, highScore) {
      safeText(scoreEl, score.toString());
      if (typeof highScore === "number") {
        safeText(highScoreEl, highScore.toString());
      }
    },
    updateLives(lives) {
      safeText(livesEl, lives.toString());
    },
    updateLevel(level, mazeName) {
      safeText(levelEl, `Lv ${level} · ${mazeName}`);
    },
    updateMode(mode) {
      safeText(modeEl, mode);
    },
    updateFrightenedTimer(ms) {
      safeText(frightenedEl, ms > 0 ? `${formatTime(ms)}s` : "—");
    },
    updateCombo(combo) {
      if (!comboEl) return;
      comboEl.textContent = combo > 0 ? `Combo ×${combo}` : "Combo ×1";
    },
    flashFruit(score) {
      if (!fruitEl) return;
      fruitEl.classList.add("active");
      fruitEl.textContent = `Fruit! +${score}`;
      setTimeout(() => {
        fruitEl.classList.remove("active");
        fruitEl.textContent = "Fruit";
      }, 1200);
    },
    setFruitActive(active) {
      if (!fruitEl) return;
      fruitEl.classList.toggle("active", active);
      fruitEl.textContent = active ? "Fruit Ready" : "Fruit";
    },
    updateState(state) {
      safeText(stateEl, state.toUpperCase());
    },
    onThemeChange(handler) {
      themeSelect?.addEventListener("change", (event) => {
        handler?.(event.target.value);
      });
    },
    setAudioEnabled(enabled) {
      if (!audioToggle) return;
      const active = Boolean(enabled);
      audioToggle.checked = active;
      if (audioVolume) {
        audioVolume.toggleAttribute("disabled", !active);
      }
    },
    setAudioVolume(value) {
      if (!audioVolume) return;
      audioVolume.value = `${value}`;
    },
    onAudioToggle(handler) {
      audioToggle?.addEventListener("change", (event) => {
        handler?.(event.target.checked);
      });
    },
    onAudioVolume(handler) {
      audioVolume?.addEventListener("input", (event) => {
        handler?.(Number(event.target.value));
      });
    },
    onDebugToggle(handler) {
      debugToggle?.addEventListener("change", (event) => {
        handler?.(event.target.checked);
      });
    },
    onReplayToggle(handler) {
      replayToggle?.addEventListener("change", (event) => {
        handler?.(event.target.checked);
      });
    },
    updateGhostMoods(moods) {
      if (!ghostMoodsEl) return;
      ghostMoodsEl.innerHTML = "";
      moods.forEach(({ name, mood, trait, affinity }) => {
        const card = document.createElement("div");
        card.className = "ghost-mood";
        const title = document.createElement("div");
        title.className = "ghost-mood__name";
        title.textContent = `${name} · ${trait}`;
        const state = document.createElement("div");
        state.className = "ghost-mood__state";
        state.textContent = mood;
        const affinityLine = document.createElement("div");
        affinityLine.textContent = `Affinity: ${affinity.toFixed(1)}`;
        card.append(title, state, affinityLine);
        ghostMoodsEl.appendChild(card);
      });
    },
    showMemory({ title, caption }) {
      if (!memoryOverlay) return;
      if (memoryTitle) memoryTitle.textContent = title;
      if (memoryCaption) memoryCaption.textContent = caption;
      memoryOverlay.classList.remove("hidden");
      memoryOverlay.setAttribute("aria-hidden", "false");
    },
    hideMemory() {
      if (!memoryOverlay) return;
      memoryOverlay.classList.add("hidden");
      memoryOverlay.setAttribute("aria-hidden", "true");
    },
    onMemoryContinue(handler) {
      memoryContinue?.addEventListener("click", (event) => {
        event.preventDefault();
        handler?.();
      });
    },
  };

  return api;
}
