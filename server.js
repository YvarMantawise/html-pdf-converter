const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'HTML to PDF converter is running!',
    usage: 'POST to /convert-html-to-pdf with {html: "your html"}'
  });
});

// Main conversion endpoint
app.post('/convert-html-to-pdf', async (req, res) => {
  try {
    console.log('Received PDF conversion request');
    
    const html = req.body.html;
    
    if (!html) {
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    console.log('Starting browser...');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();
    
    // Viewport instellen voor goede rendering
    await page.setViewport({ width: 1200, height: 800 });
    
    // HTML laden
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000 
    });

    // Wacht tot fonts geladen zijn
    await page.evaluateHandle('document.fonts.ready');

    console.log('Generating PDF...');

    // PDF genereren met exacte layout behoud
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, // CRUCIAAL voor je kleuren/gradients
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm', 
        left: '10mm'
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      scale: 0.8 // Zorgt dat alles mooi past
    });

    await browser.close();
    console.log('PDF generated successfully');

    // PDF terugsturen
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="feedbackrapport.pdf"',
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF', 
      details: error.message 
    });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
});
