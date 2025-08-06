// Test setCountry de whatsapp-service.js

const { inputCountryNumber } = require('../services/whatsapp-service');


const device = "127.0.0.1:6065";

async function testService() {
    await inputCountryNumber(device, '1234567890', 'CANADA');
}

testService();