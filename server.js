const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const puppeteer = require('puppeteer-core');
const path = require('path');

const app = express();

app.use(session({
    secret: 'faultier_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/generate-pdf', limiter);

const PX_TO_MM = 0.264583; // 96dpi → mm

app.post('/generate-pdf', express.text({ type: '*/*', limit: '2mb' }), async (req, res) => {
    if (!req.session.count) req.session.count = 0;
    if (req.session.count >= 10) {
        return res.status(429).send('Session limit reached');
    }

    if (!req.body) return res.status(400).send('No HTML provided');

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-gpu']
        });

        const page = await browser.newPage();

        await page.setContent(req.body, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('screen');
        // Ensure web fonts are ready (Chromium 85+)
        await page.evaluate(() => document.fonts && document.fonts.ready);

        // Measure total doc height in px
        const pxHeight = await page.evaluate(() => {
            const b = document.body;
            const h = document.documentElement;
            return Math.max(
                b.scrollHeight,
                b.offsetHeight,
                h.clientHeight,
                h.scrollHeight,
                h.offsetHeight
            );
        });

        const heightMm = Math.ceil(pxHeight * PX_TO_MM); // round up to avoid clipping

        const pdfBuffer = await page.pdf({
            // Do NOT set `format`
            width: '210mm',           // keep A4 width
            height: `${heightMm}mm`,  // dynamic height
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: false  // we’re forcing our own size
        });

        await page.close();
        await browser.close();

        req.session.count++;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Faultier-CV.pdf"');
        res.send(pdfBuffer);
    } catch (err) {
        console.error(err);
        if (browser) await browser.close();
        res.status(500).send('Failed to generate PDF');
    }
});

app.use(express.static(path.join(__dirname, 'dist')));

const PORT = process.env.PORT || 3080;
app.listen(PORT, (err) => {
    if (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
    console.log(`Server running on port ${PORT} - http://localhost:${PORT}`);
});
