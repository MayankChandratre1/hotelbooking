
const express = require('express');
const router = express.Router();
const { scrapeHotelsComHotels } = require('./hotelsScrapeController');

router.post('/scrape/hotels-com', async (req, res) => {
    try {
        const { location, checkIn, checkOut, adults, children, infants, pages } = req.body;

        if (!location || !checkIn || !checkOut) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameters: location, checkIn, and checkOut are required' 
            });
        }

        const searchParams = {
            location,
            checkIn,
            checkOut,
            adults: parseInt(adults) || 2,
            children: parseInt(children) || 0,
            infants: parseInt(infants) || 0
        };

        console.log('Received Hotels.com scraping request with params:', searchParams);

        const hotels = await scrapeHotelsComHotels(searchParams, parseInt(pages) || 5);
        res.json({ 
            success: true, 
            count: hotels.length, 
            data: hotels 
        });
    } catch (error) {
        console.error('Hotels.com scraping route error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;