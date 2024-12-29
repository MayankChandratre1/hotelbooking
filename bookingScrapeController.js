
const Hotel = require('./model');
const { buildBookingUrl } = require('./bookingUrlBuilder');
const { initializePuppeteer } = require('./puppeteerConfig');

const generateBookingPaginationUrls = (baseUrl, count) => {
    const urls = [];
    for (let i = 0; i < count; i++) {
        const offset = i * 25; 
        const paginatedUrl = `${baseUrl}&offset=${offset}`;
        urls.push(paginatedUrl);
    }
    return urls;
};

const scrapeBookingPage = async (page, url, searchParams) => {
    try {
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });
        
        await page.waitForSelector('[data-testid="property-card"]', { timeout: 30000 });
        
        const hotels = await page.evaluate((searchParams) => {
            const hotelElements = document.querySelectorAll('[data-testid="property-card"]');
            
            return Array.from(hotelElements).map(hotel => {
                // Updated title selector using multiple approaches to ensure we get the title
                const titleElement = hotel.querySelector('[data-testid="title"]') || 
                                   hotel.querySelector('div.f6431b446c.a15b38c233') ||
                                   hotel.querySelector('.f2cf178bcd h2');
                const mainHeading = titleElement ? titleElement.textContent.trim() : "Title not found";

                // Updated price selectors
                const originalPriceElement = hotel.querySelector('span.a3b8729ab1');
                const discountedPriceElement = hotel.querySelector('span.f6431b446c');
                let price = "Price not found";
                
                if (discountedPriceElement) {
                    price = discountedPriceElement.innerText.trim().replace(/[^0-9.]/g, '');
                } else if (originalPriceElement) {
                    price = originalPriceElement.innerText.trim().replace(/[^0-9.]/g, '');
                }

                // Updated taxes selector
                const taxesElement = hotel.querySelector('[data-testid="taxes-and-charges"]');
                let totalPrice = price;
                if (taxesElement) {
                    const taxesText = taxesElement.innerText.trim();
                    const taxesAmount = taxesText.match(/\d+(\.\d+)?/);
                    if (taxesAmount) {
                        totalPrice = (parseFloat(price) + parseFloat(taxesAmount[0])).toString();
                    }
                }

                // Get rating if available (optional)
                const ratingElement = hotel.querySelector('div.abf093bdfe.d86cee9b25');
                const rating = ratingElement ? ratingElement.innerText.trim().match(/\d+(\.\d+)?/)?.[0] : null;

                return {
                    mainHeading,
                    pricePerNight: price,
                    totalPrice,
                    rating,
                    site: 'booking',
                    searchParams: {
                        location: searchParams.location,
                        checkIn: searchParams.checkIn,
                        checkOut: searchParams.checkOut,
                        adults: parseInt(searchParams.adults) || 2,
                        children: parseInt(searchParams.children) || 0,
                        infants: 0
                    }
                };
            });
        }, searchParams);

        return hotels;
    } catch (error) {
        console.error('Scraping error:', error);
        return [];
    }
};

const scrapeBookingHotels = async (searchParams, pagesCount = 5) => {
    const browser = await initializePuppeteer();
    const pages = await Promise.all(Array(pagesCount).fill(null).map(() => browser.newPage()));
    
    try {
        const baseUrl = buildBookingUrl(searchParams);
        const urls = generateBookingPaginationUrls(baseUrl, pagesCount);
        
        console.log('Starting Booking.com scraping with URLs:', urls);
        
        const batchResults = await Promise.all(
            urls.map((url, index) => scrapeBookingPage(pages[index], url, searchParams))
        );

        const hotels = batchResults.flat();
        console.log(`Found ${hotels.length} hotels on Booking.com`);
        
        await updateHotelsInDB(hotels);
        return hotels;
    } catch (error) {
        console.error('Error in scrapeBookingHotels:', error);
        throw error;
    } finally {
        await Promise.all(pages.map(page => page.close()));
        await browser.close();
    }
};
const updateHotelsInDB = async (hotels) => {
    const results = {
        updated: 0,
        inserted: 0,
        errors: 0
    };

    for (const hotel of hotels) {
        try {
            
            const hotelData = {
                ...hotel,
                searchParams: {
                    ...hotel.searchParams,
                    checkIn: hotel.searchParams?.checkIn?.toString() || '',
                    checkOut: hotel.searchParams?.checkOut?.toString() || ''
                }
            };

            
            let existingHotel = await Hotel.findOne({
                mainHeading: hotel.mainHeading,
                subHeading: hotel.subHeading
            });

            if (existingHotel) {

                const updated = await Hotel.findByIdAndUpdate(
                    existingHotel._id,
                    { $set: {
                        ...hotelData,
                        lastUpdated: new Date()
                    } },
                    { new: true, runValidators: true }
                );
                if (updated) {
                    results.updated++;
                }
            } else {
                
                const newHotel = new Hotel(hotelData);
                await newHotel.save();
                results.inserted++;
            }
        } catch (error) {
            console.error('Error updating hotel:', error);
            results.errors++;
        }
    }

    console.log('Database update results:', results);
    return results;
};
module.exports = {scrapeBookingHotels}