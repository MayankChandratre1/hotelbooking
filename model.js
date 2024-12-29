
const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
    mainHeading: { type: String, required: true },
    subHeading: { type: String, required: true },
    pricePerNight: String,
    totalPrice: String,
    site: { type: String, required: true, enum: ['airbnb', 'hotels.com', 'booking.com'] }, 
    searchParams: {
        location: String,
        checkIn: String,
        checkOut: String,
        adults: Number,
        children: Number,
        infants: Number
    },
    lastUpdated: { type: Date, default: Date.now }
});

const Hotel = mongoose.model('Hotel', hotelSchema);