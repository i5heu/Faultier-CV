const express = require('express');
const rateLimit = require('express-rate-limit');
const puppeteer = require('puppeteer-core');
const path = require('path');

const app = express();

const limiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/generate-pdf', limiter);

const PX_TO_MM = 0.264583; // 96dpi → mm

app.post('/generate-pdf', express.text({ type: '*/*', limit: '2mb' }), async (req, res) => {
    if (!req.body) return res.status(400).send('No HTML provided');

    let browser, page;
    let aborted = false;
    let cleaned = false;

    const tidy = async (why) => {
        if (cleaned) return;
        cleaned = true;
        try { if (page && !page.isClosed()) await page.close(); } catch { }
        try { if (browser) await browser.close(); } catch { }
        if (why) console.log(`[TIDY] ${why}`);
    };

    // Fires ONLY when client really aborts the request body/connection
    req.on('aborted', () => {
        aborted = true;
        tidy('req aborted');
    });

    // res.finish = sent successfully; res.close without finished = likely aborted
    res.on('finish', () => tidy('response finished'));
    res.on('close', () => {
        if (!res.writableEnded) {
            aborted = true;
            tidy('response closed early (client likely disconnected)');
        }
    });

    try {
        if (aborted) return;

        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/google-chrome',
            args: ['--no-sandbox', '--disable-gpu']
        });

        page = await browser.newPage();
        await page.setContent(req.body, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('screen');
        await page.evaluate(() => document.fonts && document.fonts.ready);

        if (aborted) return;

        const PX_TO_MM = 0.264583;
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
        const heightMm = Math.ceil(pxHeight * PX_TO_MM);

        if (aborted) return;

        const pdfBuffer = await page.pdf({
            width: '210mm',
            height: `${heightMm}mm`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: false
        });

        if (aborted) return;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Faultier-CV.pdf"');
        res.end(pdfBuffer);
    } catch (err) {
        console.error(err);
        if (!aborted && !res.headersSent) {
            res.status(500).send('Failed to generate PDF');
        }
    } finally {
        await tidy('finally');
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
