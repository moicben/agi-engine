export async function pressKey(page, key, count) {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(key);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}