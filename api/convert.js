const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser = null;

  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    // New configuration for latest versions
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: true,
      },
      executablePath: await chromium.executablePath(),
      headless: "shell", // Required for v138+
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    
    return res.status(500).json({ 
      error: 'PDF generation failed', 
      message: error.message
    });
  }
};
