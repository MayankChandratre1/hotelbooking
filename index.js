const express = require("express");

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const bookingRoutes = require('./bokkingRoutes');
const hotelRotes = require('./hotelRoutes');
// app.use('/api',hotelRotes)
app.use('/api', bookingRoutes);
app.listen(3001,(err,res)=>{
    console.log("listening")
});