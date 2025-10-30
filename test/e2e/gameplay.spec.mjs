import { test, expect } from '@playwright/test';

async function waitForGame(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.pacDebug?.game?.pacMan);
}

test('collecting an energy node increases the score', async ({ page }) => {
  await waitForGame(page);
  const initialScore = await page.locator('#score').innerText();

  await page.evaluate(() => {
    const { game } = window.pacDebug;
    const player = game.pacMan;
    const layout = player.maze.layout;
    let pelletCol = 1;
    let pelletRow = 1;
    outer: for (let row = 0; row < layout.length; row += 1) {
      const col = layout[row].indexOf('.');
      if (col !== -1) {
        pelletCol = col;
        pelletRow = row;
        break outer;
      }
    }
    const target = player.maze.tileCenter(pelletCol, pelletRow);
    player.x = target.x;
    player.y = target.y;
    player.setDirection({ x: 0, y: 0 });
    game.update(16);
  });

  await expect(page.locator('#score')).not.toHaveText(initialScore);
});

test('toggling modern mode switches body dataset', async ({ page }) => {
  await waitForGame(page);
  const modeSelect = page.locator('#mode');
  await modeSelect.selectOption('modern');
  await expect(page.locator('body')).toHaveAttribute('data-mode', /modern/);
  await modeSelect.selectOption('classic');
  await expect(page.locator('body')).toHaveAttribute('data-mode', /classic/);
});
