
const Hotel = require('./model');
const { buildHotelsComUrl } = require('./urlBuilder');
const { initializePuppeteer } = require('./puppeteerConfig');

const generatePaginationUrls = (baseUrl, count) => {
    const urls = [];
    for (let i = 0; i < count; i++) {
        // Hotels.com uses page parameter for pagination
        const paginatedUrl = `${baseUrl}&page=${i + 1}`;
        urls.push(paginatedUrl);
    }
    return urls;
};

const scrapeHotelPage = async (page, url, searchParams) => {
    try {
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        // Wait for hotel cards to load
        await page.waitForSelector('.uitk-card', { timeout: 30000 });

        const hotels = await page.evaluate((searchParams) => {
            const hotelElements = document.querySelectorAll('.uitk-card');
            
            return Array.from(hotelElements).map((hotel) => {
                const mainHeadingElement = hotel.querySelector('.uitk-heading-5');
                const mainHeading = mainHeadingElement ? mainHeadingElement.innerText.trim() : "Title not found";

                const subHeadingElement = hotel.querySelector('.uitk-text.uitk-type-300');
                const subHeading = subHeadingElement ? subHeadingElement.innerText.trim() : "Location not found";

                const priceElement = hotel.querySelector('.uitk-type-500.uitk-type-medium');
                const price = priceElement ? priceElement.innerText.trim().replace(/[^0-9.]/g, '') : "Price not found";

                const totalPriceElement = hotel.querySelector('.uitk-type-200:not(.uitk-type-bold)');
                const totalPrice = totalPriceElement ? 
                    totalPriceElement.innerText.trim().replace(/[^0-9.]/g, '') : 
                    "Total price not found";

                const ratingElement = hotel.querySelector('.uitk-badge-base-text');
                const rating = ratingElement ? 
                    parseFloat(ratingElement.innerText.trim()) : 
                    null;

                const reviewsElement = hotel.querySelector('.uitk-type-200.uitk-type-regular');
                const reviews = reviewsElement ? 
                    parseInt(reviewsElement.innerText.match(/\d+/)[0]) : 
                    0;

                return {
                    mainHeading,
                    subHeading,
                    pricePerNight: price,
                    totalPrice,
                    rating,
                    reviews,
                    siteName: 'hotels.com',
                    searchParams: {
                        location: searchParams.location,
                        checkIn: searchParams.checkIn,
                        checkOut: searchParams.checkOut,
                        adults: parseInt(searchParams.adults) || 2,
                        children: parseInt(searchParams.children) || 0,
                        infants: parseInt(searchParams.infants) || 0
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

const scrapeHotelsComHotels = async (searchParams, pagesCount = 5) => {
    const browser = await initializePuppeteer();
    const pages = await Promise.all(Array(pagesCount).fill(null).map(() => browser.newPage()));
    
    try {
        const baseUrl = buildHotelsComUrl(searchParams);
        const urls = generatePaginationUrls(baseUrl, pagesCount);
        
        console.log('Starting Hotels.com scraping with URLs:', urls);
        
        const batchResults = await Promise.all(
            urls.map((url, index) => scrapeHotelPage(pages[index], url, searchParams))
        );

        const hotels = batchResults.flat();
        console.log(`Found ${hotels.length} hotels on Hotels.com`);
        
        await updateHotelsInDB(hotels);
        return hotels;
    } catch (error) {
        console.error('Error in scrapeHotelsComHotels:', error);
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

module.exports = {
    scrapeHotelsComHotels,
    generatePaginationUrls
};

// routes/hotelRoutes.js