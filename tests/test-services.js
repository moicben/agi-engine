// Test setCountry de whatsapp-service.js

const { deviceService } = require('../services/device-service');


async function testService() {
    await deviceService.discoverBluestacksInstance();
}

testService();