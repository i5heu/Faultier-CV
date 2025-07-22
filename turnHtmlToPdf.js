const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

(async () => {
    console.log('launching Chrome...');
    const browser = await puppeteer.launch({
        headless: true,
        dumpio: true,
        executablePath: '/usr/bin/google-chrome',
        args: [
            '--headless',
            '--disable-gpu',
            '--no-sandbox',
            '--enable-logging=stderr',
            '--v=1'
        ],
    });
    console.log('✅ Chrome launched');

    const htmlFiles = fs.readdirSync(process.cwd())
        .filter(f => f.toLowerCase().endsWith('.html'));
    if (htmlFiles.length === 0) {
        console.error('no .html files found');
        await browser.close();
        process.exit(1);
    }

    for (const file of htmlFiles) {
        console.log(`\nProcessing ${file}`);
        const page = await browser.newPage();
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        try {
            console.log('  ↪️  goto() →', file);
            await page.goto(`file://${path.join(process.cwd(), file)}`, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            console.log('  ✅ Page loaded');

            const pxHeight = await page.evaluate(() => {
                const b = document.body, h = document.documentElement;
                return Math.max(b.scrollHeight, b.offsetHeight, h.clientHeight, h.scrollHeight, h.offsetHeight);
            });
            console.log(`measured content height: ${pxHeight}px`);

            const heightMm = (pxHeight * 0.264583).toFixed(1); // convert pixels to mm 
            console.log(`converted to ${heightMm} mm`);

            const pdfPath = file.replace(/\.html$/i, '.pdf');
            await page.pdf({
                path: pdfPath,
                width: '210mm',
                height: `${heightMm}mm`,
                printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });
            console.log(`PDF saved: ${pdfPath}`);
        } catch (err) {
            console.error(`error:`, err);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    console.log('\n done');
})();
