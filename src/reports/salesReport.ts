import { Browser } from 'puppeteer';
import { injectD3 } from '../utils/d3Helper';

export const generateSalesReport = async (browser: Browser): Promise<Uint8Array> => {
  const page = await browser.newPage();

  // 1. Listen for errors in the browser
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', (err as Error).toString()));

  // 2. Set the HTML with an EMPTY container
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 40px; }
          .chart-container { width: 500px; height: 300px; border: 1px solid #eee; }
        </style>
      </head>
      <body>
        <h1>Sales Report</h1>
        <div id="sales-chart" class="chart-container"></div>
      </body>
    </html>
  `;
  await page.setContent(htmlContent);

  // 3. Inject D3
  await injectD3(page);

  // 4. DRAW THE CHART (Inside the browser context)
  // We pass the data in as an argument to avoid scope issues
  const chartData = [10, 20, 30, 40, 50, 60];

  await page.evaluate((data) => {
    // @ts-ignore (TS doesn't know d3 exists in the browser window)
    if (!window.d3) {
      console.error("D3 was not loaded!");
      return;
    }

    const svg = window.d3.select("#sales-chart")
      .append("svg")
      .attr("width", 500)
      .attr("height", 300);

    // Draw bars
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d, i) => i * 70)
      .attr("y", d => 300 - d * 4)
      .attr("width", 50)
      .attr("height", d => d * 4)
      .attr("fill", "#4CAF50");

    // Add a flag to the body so Puppeteer knows we are done
    document.body.classList.add('chart-render-complete');

  }, chartData);

  // 5. WAIT FOR THE CHART TO EXIST
  // This is the magic fix. We wait until the <svg> tag is actually in the DOM.
  try {
    await page.waitForSelector('#sales-chart svg', { timeout: 5000 });
  } catch (e) {
    console.error("Timeout: Chart SVG never appeared.");
  }

  // 6. Generate PDF
  const pdfBuffer = await page.pdf({ 
    format: 'A4',
    printBackground: true // Required for colors to show up
  });
  
  await page.close();
  return pdfBuffer;
};