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

  try {
    console.log('Request received, parsing body...');
    
    const { html } = req.body;
    
    if (!html) {
      console.log('No HTML provided');
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    console.log('HTML received, length:', html.length);
    console.log('Starting browser...');
    
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    console.log('Browser started, creating page...');
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('Setting content...');
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 25000 
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
    console.log('PDF generated successfully');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="feedbackrapport.pdf"');
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Detailed error:', error);
    return res.status(500).json({ 
      error: 'PDF generation failed', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
