const PANELS = [
  {
    title: "Memory 1: The Challenge",
    caption:
      "Pac-Man accepted the haunted arcade's wager: clear endless mazes and your friends go free.",
  },
  {
    title: "Memory 2: The Pact",
    caption:
      "The ghosts were once champions too. Betrayed by the arcade master, they now roam as wardens.",
  },
  {
    title: "Memory 3: A Broken Promise",
    caption:
      "Pac-Man almost escaped, but returned when he heard the ghosts' pleas for help.",
  },
  {
    title: "Memory 4: Hidden Exit",
    caption:
      "Legends whisper of a door behind the neon maze that opens only when trust outweighs fear.",
  },
  {
    title: "Memory 5: Ghostly Bonds",
    caption:
      "Blinky guards the exit, Pinky maps secret routes, Inky listens, Clyde just wants a friend.",
  },
];

export function getMemoryPanel(level) {
  if (!level || level < 1) return PANELS[0];
  return PANELS[(level - 1) % PANELS.length];
}

export function allMemoryPanels() {
  return PANELS.slice();
}
