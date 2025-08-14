// Tester le brain

import { think } from '../core/brain/think.js';

async function testBrain() {
    const response = await think('Hello, how are you?');
    console.log(response);
}

testBrain();