import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

export const getBrowser = async (): Promise<Browser> => {
  // 1. If browser exists and is connected, return it
  if (browserInstance?.connected) {
    return browserInstance;
  }

  // 2. Otherwise, launch a new one
  console.log("Launching new Puppeteer Browser instance...");
  browserInstance = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Recommended for server environments
  });

  return browserInstance;
};

export const closeBrowser = async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log("Puppeteer Browser closed.");
  }
};