import { PDFDocument } from 'pdf-lib';
import { getBrowser } from './browserService'; // Import the singleton getter
import { generateSalesReport } from '../reports/salesReport';
import { BreakevenReport } from '../reports/breakeven-report';

const breakevendemo_data = {
    "revenue": 22973.18,
    "cos": 775.98,
    "expense": 19167.52,
    "fixedcosts": 19167.52,
    "expenses": 19943.5,
    "gross_profit": 22197.2,
    "net_profit": 3029.68,
    "ebit": 3029.68,
    "top_expense": {
        "Advertising": 9657.05,
        "Rent": 3273.6600000000003,
        "Repairs and Maintenance": 1896.7,
        "Entertainment": 1553.6,
        "Office Expenses": 812.59,
        "Motor Vehicle Expenses": 654.36,
        "Light, Power, Heating": 335.82,
        "Travel - National": 255.8,
        "General Expenses": 166.28,
        "Telephone & Internet": 134.75,
        "Cleaning": 110,
        "Freight & Courier": 105.5,
        "Printing & Stationery": 94.41000000000001,
        "Consulting & Accounting": 87,
        "Bank Fees": 30,
        "Superannuation": 0,
        "Unrealised Currency Gains": 0,
        "Travel - International": 0,
        "Realised Currency Gains": 0,
        "Subscriptions": 0,
        "Bank Revaluations": 0,
        "Legal expenses": 0,
        "Insurance": 0,
        "Wages and Salaries": 0
    },
    "top_revenue": {
        "Sales": 22973.18,
        "Interest Income": 0,
        "Other Revenue": 0
    }
}

export const generateCombinedReport = async (): Promise<Uint8Array> => {
  // 1. Get the SHARED browser instance
  const browser = await getBrowser();

  try {
    const breakevenReport = new BreakevenReport(breakevendemo_data);
    const [salesPdfBuffer, userPdfBuffer] = await Promise.all([
      generateSalesReport(browser),
      breakevenReport.generate(browser)
    ]);

    // 3. Merge PDFs (Same as before)
    const mergedPdf = await PDFDocument.create();
    const pdfsToMerge = [salesPdfBuffer, userPdfBuffer];

    for (const pdfBytes of pdfsToMerge) {
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();

  } catch (error) {
    console.error("Error during report generation:", error);
    throw error;
  }
  // DO NOT close the browser here!
};