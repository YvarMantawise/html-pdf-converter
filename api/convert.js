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
    console.log('Request received, parsing body...');
    console.log('Request body:', req.body);
    console.log('Body type:', typeof req.body);
    
    const { html } = req.body;
    
    if (!html) {
      console.log('No HTML provided');
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    console.log('HTML received, length:', html.length);
    console.log('Starting browser...');
    
    // CRITICAL: These args are essential for Vercel
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process', // Important for serverless
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    console.log('Browser started, creating page...');
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('Setting content...');
    // CRITICAL: Only use domcontentloaded, not networkidle0
    await page.setContent(html, { 
      waitUntil: ['domcontentloaded'],
      timeout: 15000 
    });

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

    await browser.close();
    browser = null; // Prevent double-close
    console.log('PDF generated successfully, size:', pdfBuffer.length);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="feedbackrapport.pdf"');
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('=== DETAILED ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('====================');
    
    // Ensure browser cleanup
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
