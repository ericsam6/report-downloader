import express from 'express';
import { generateCombinedReport } from './services/pdfGenerator';
import { getBrowser, closeBrowser } from './services/browserService';

const app = express();
const port = 3000;

// ... routes ...
app.get('/download-report', async (req, res) => {
   // ... call generateCombinedReport() ...
   const pdf = await generateCombinedReport();
   res.end(Buffer.from(pdf));
});

const server = app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}`);
  
  // Pre-warm the browser so the first request is fast
  await getBrowser();
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log(' shutting down...');
  await closeBrowser(); // Close Puppeteer
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});