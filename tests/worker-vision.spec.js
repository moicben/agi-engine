import visionWorker from '../workers/vision.js';

async function main() {
  const res = await visionWorker.detect({ image: '/Users/ben/Documents/agi-engine/public/vision-img.png', query: 'SWIFT', annotate: false });
  if (res && typeof res.success === 'boolean') {
    console.log('OK: vision.detect returned', res.success);
    process.exit(0);
  }
  console.error('FAIL: vision.detect returned invalid structure');
  process.exit(2);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(2); });


