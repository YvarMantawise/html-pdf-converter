const { chromium } = require('playwright-core');

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
    console.log('=== REQUEST START ===');
    console.log('Request body:', req.body);
    
    const { html } = req.body;
    
    if (!html) {
      console.log('ERROR: No HTML provided');
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    console.log('HTML received, length:', html.length);
    console.log('Starting Playwright browser...');
    
    // Playwright handles serverless environments much better
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling'
      ]
    });

    console.log('Browser launched successfully');
    const page = await browser.newPage();
    
    console.log('Setting page content...');
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    console.log('Content set successfully');

    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm', 
        bottom: '15mm',
        left: '10mm'
      },
      scale: 0.8
    });
    console.log('PDF generated, size:', pdfBuffer.length);

    await browser.close();
    browser = null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    
    console.log('=== SUCCESS ===');
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('=== ERROR DETAILS ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('==================');
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }
    
    return res.status(500).json({ 
      error: 'PDF generation failed', 
      message: error.message,
      name: error.name
    });
  }
};
