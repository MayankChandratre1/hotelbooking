
const buildHotelsComUrl = (params) => {
    if (!params || !params.location) {
        throw new Error('Location parameter is required');
    }

    const baseUrl = 'https://www.hotels.com/Hotel-Search';
    const searchParams = new URLSearchParams({
        destination: `${params.location} (and vicinity)`,
        startDate: params.checkIn || '',
        endDate: params.checkOut || '',
        d1: params.checkIn || '',
        d2: params.checkOut || '',
        rooms: '1',
        adults: params.adults || '2',
        flexibility: '0_DAY',
        isInvalidatedDate: 'false',
        useRewards: 'false',
        sort: 'RECOMMENDED'
    });

    return `${baseUrl}?${searchParams.toString()}`;
};
module.exports = {buildHotelsComUrl}