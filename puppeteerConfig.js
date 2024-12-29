const puppeteer = require('puppeteer');
const initializePuppeteer = async () => {
    return await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
}

module.exports = {initializePuppeteer};