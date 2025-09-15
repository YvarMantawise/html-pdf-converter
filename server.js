import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import multer from 'multer'; // <-- nieuw

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// app.use(express.json({ limit: '10mb' })); // JSON niet meer nodig voor HTML via form-data
const upload = multer(); // memory storage, alleen voor text fields

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'HTML to PDF Converter is running on Railway!',
    endpoint: '/convert'
  });
});

// PDF conversion endpoint
app.post('/convert', upload.none(), async (req, res) => {
  let browser = null;

  try {
    const { html } = req.body; // <-- nu komt HTML uit form-data
    if (!html) {
      return res.status(400).json({ error: 'No HTML content provided' });
    }

    console.log('Starting PDF conversion...');

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
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
    browser = null;

    console.log('PDF generated successfully');

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"',
      'Content-Length': pdfBuffer.length
    });

    return res.end(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    if (browser) {
      try { await browser.close(); } catch (e) { console.error('Error closing browser:', e); }
    }
    return res.status(500).json({
      error: 'PDF generation failed',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
