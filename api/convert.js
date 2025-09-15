import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    console.log('Starting browser...');
    
    // Vercel-optimized browser config
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Viewport voor perfecte rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    // HTML laden met alle styling
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 25000 
    });

    // Wacht op fonts
    await page.evaluateHandle('document.fonts.ready');

    console.log('Generating PDF with exact layout...');

    // PDF met 100% layout behoud
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // CRUCIAAL voor je styling
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      scale: 0.8
    });

    await browser.close();
    console.log('PDF generated successfully');

    // PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="feedbackrapport.pdf"');
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    });
  }
}
