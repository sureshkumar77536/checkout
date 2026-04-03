// Netlify Function for processing checkout
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { url, card } = JSON.parse(event.body);

    if (!url || !card) {
        return { statusCode: 400, body: 'Missing required fields' };
    }

    let browser = null;

    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        
        // Navigate to Stripe checkout
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for payment form
        await page.waitForSelector('[data-testid="card-number-input"]', { timeout: 10000 });

        // Fill card details
        await page.type('[data-testid="card-number-input"]', card.number);
        await page.type('[data-testid="card-expiry-input"]', card.expiry);
        await page.type('[data-testid="card-cvc-input"]', card.cvc);

        // Submit payment
        await page.click('[data-testid="pay-button"]');
        
        // Wait for result
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

        const success = await page.evaluate(() => {
            return document.querySelector('[data-testid="success-message"]') !== null;
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success,
                message: success ? 'Payment successful' : 'Payment failed'
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};
