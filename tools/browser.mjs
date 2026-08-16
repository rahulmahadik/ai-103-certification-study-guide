/**
 * browser.mjs — one place to launch Chromium.
 *
 * Three build steps drive a headless browser: the cheat sheet render, the
 * social card, and the diagram checker. On a GitHub Actions runner a default
 * launch dies during startup with nothing but a register dump, because the
 * runner cannot give Chromium the kernel namespaces its sandbox needs and
 * because /dev/shm on the runner is far smaller than Chromium expects.
 *
 * Both flags are safe in this project: every page opened is a local file this
 * repository generated. They are applied only under CI, so a local run keeps
 * the sandbox on.
 */
import puppeteer from 'puppeteer';

/** Flags a GitHub Actions runner needs before Chromium will start at all. */
const CI_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

/**
 * Launch Chromium with the project's defaults.
 *
 * Caller args are appended, so a step can still ask for srgb or hinting.
 */
export function launch({ args = [], ...rest } = {}) {
  return puppeteer.launch({
    headless: 'new',
    args: [...(process.env.CI ? CI_ARGS : []), ...args],
    ...rest,
  });
}
