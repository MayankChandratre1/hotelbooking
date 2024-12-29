
const express = require('express');
const router = express.Router();
const {scrapeBookingHotels } = require('./bookingScrapeController');

router.post('/scrape-booking', async (req, res) => {
    try {
        const { location, checkIn, checkOut, adults, children, pages } = req.body;
        
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
            children: parseInt(children) || 0
        };
        
        console.log('Received Booking.com scraping request with params:', searchParams);
        
        const hotels = await scrapeBookingHotels(searchParams, parseInt(pages) || 5);
        res.json({
            success: true,
            count: hotels.length,
            data: hotels
        });
    } catch (error) {
        console.error('Booking.com scraping route error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
