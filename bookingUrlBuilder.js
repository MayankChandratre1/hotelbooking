
const buildBookingUrl = (params) => {
    if (!params || !params.location) {
        throw new Error('Location parameter is required');
    }
    
    const baseUrl = 'https://www.booking.com/searchresults.html';
    const searchParams = new URLSearchParams({
        ss: params.location,
        checkin: params.checkIn || '',
        checkout: params.checkOut || '',
        group_adults: params.adults || 2,
        group_children: params.children || 0,
        no_rooms: 1,
        selected_currency: 'USD'
    });
    
    return `${baseUrl}?${searchParams.toString()}`;
};
module.exports={buildBookingUrl}