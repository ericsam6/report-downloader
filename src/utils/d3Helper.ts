import { Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';

/**
 * Robustly finds the absolute path to d3.min.js
 * regardless of where require.resolve('d3') points.
 */
const getD3Path = (): string => {
  try {
    // 1. Ask Node where the main entry point is
    let currentPath = require.resolve('d3');

    // 2. Walk up the directory tree until we find the folder containing 'package.json'
    //    This guarantees we are at the root of the 'd3' package.
    while (!fs.existsSync(path.join(currentPath, 'package.json'))) {
      const parent = path.dirname(currentPath);
      if (parent === currentPath) break; // Stop if we hit root of filesystem
      currentPath = parent;
    }

    // 3. Now that we are at the root (node_modules/d3/), point to the browser build
    const browserBuildPath = path.join(currentPath, 'dist', 'd3.min.js');

    if (fs.existsSync(browserBuildPath)) {
      return browserBuildPath;
    }
  } catch (err) {
    console.warn("Could not auto-resolve D3 path via require.");
  }

  // 4. Fallback: Manual Hardcoded Path (Works if you are in the project root)
  //    This handles cases where module resolution is very strict.
  return path.resolve(process.cwd(), 'node_modules', 'd3', 'dist', 'd3.min.js');
};

const d3Path = getD3Path();

export const injectD3 = async (page: Page) => {
  // Final verify before crashing
  if (!fs.existsSync(d3Path)) {
    throw new Error(`CRITICAL: Could not find d3.min.js at: ${d3Path}. Please ensure 'npm install d3' is run.`);
  }
  
  await page.addScriptTag({ path: d3Path });
};