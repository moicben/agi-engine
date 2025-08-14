// Test file to verify all dependencies are working

import { config } from '../core/config.js';
import { think } from '../core/brain/think.js';

console.log('🧪 Testing AGI Engine dependencies...\n');

// Test 1: Check if config loads correctly
console.log('1️⃣ Testing configuration...');
try {
    console.log('✅ Config loaded successfully');
    console.log('   - LLM Model:', config.llm.model);
    console.log('   - VPN Country:', config.vpn.country);
} catch (error) {
    console.log('❌ Config error:', error.message);
}

// Test 2: Test basic imports
console.log('\n2️⃣ Testing basic imports...');
try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dotenv = await import('dotenv');
    console.log('✅ Basic Node.js modules imported successfully');
} catch (error) {
    console.log('❌ Basic imports error:', error.message);
}

// Test 3: Test external dependencies
console.log('\n3️⃣ Testing external dependencies...');
try {
    const openai = await import('openai');
    console.log('✅ OpenAI imported successfully');
} catch (error) {
    console.log('❌ OpenAI import error:', error.message);
}

try {
    const puppeteer = await import('puppeteer');
    console.log('✅ Puppeteer imported successfully');
} catch (error) {
    console.log('❌ Puppeteer import error:', error.message);
}

try {
    const playwright = await import('playwright');
    console.log('✅ Playwright imported successfully');
} catch (error) {
    console.log('❌ Playwright import error:', error.message);
}

try {
    const xlsx = await import('xlsx');
    console.log('✅ XLSX imported successfully');
} catch (error) {
    console.log('❌ XLSX import error:', error.message);
}

// Test 4: Test brain module
console.log('\n4️⃣ Testing brain module...');
try {
    const response = await think('Hello, this is a test message');
    console.log('✅ Brain module working');
    console.log('   Response:', response.substring(0, 100) + '...');
} catch (error) {
    console.log('❌ Brain module error:', error.message);
}

console.log('\n🎉 Dependency test completed!');
