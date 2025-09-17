import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3000;

// Authentication configuration
const API_KEY = process.env.API_KEY || 'your-secret-api-key-here'; // Set this in your environment variables

// Middleware
app.use(cors());
const upload = multer(); // memory storage, only for text fields

// Authentication middleware
const authenticateAPI = (req, res, next) => {
  // Check for API key in different possible header formats
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.headers['api-key'];

  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Authentication required', 
      message: 'API key must be provided in x-api-key header' 
    });
  }

  if (apiKey !== API_KEY) {
    return res.status(403).json({ 
      error: 'Invalid API key', 
      message: 'The provided API key is not valid' 
    });
  }

  // API key is valid, continue to the next middleware/route
  next();
};

// Public health check (no authentication needed)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'HTML to PDF Converter is running on Railway!',
    endpoint: '/convert',
    note: 'Authentication required for /convert endpoint'
  });
});

// Protected PDF conversion endpoint
app.post('/convert', authenticateAPI, upload.none(), async (req, res) => {
  let browser = null;

  try {
    const { html } = req.body;
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

// Optional: Add a test endpoint to verify authentication
app.get('/test-auth', authenticateAPI, (req, res) => {
  res.json({ 
    message: 'Authentication successful!', 
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key required for protected endpoints: ${API_KEY ? 'Yes' : 'No'}`);
});
