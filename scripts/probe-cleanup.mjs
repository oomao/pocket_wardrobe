// Probe candidate cleanup Spaces with a real (small) garment-like image to
// see whether anonymous /predict actually returns something (not IndexError).

import { Client, handle_file } from '@gradio/client';

const SPACE = process.argv[2] || 'fffiloni/InstantIR';

// 64×64 dark-blue square so the model has actual content to work with.
const buf = Buffer.alloc(64 * 64 * 3, 0);
for (let i = 0; i < buf.length; i += 3) {
  buf[i] = 0x1e; buf[i + 1] = 0x40; buf[i + 2] = 0x80;
}
// Build a proper PNG header by piping through a canvas-like encoder.
// Easier: use a tiny pre-encoded 16×16 navy PNG.
const PIXEL_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR4nGP8z8DwH4YxASMJDDxiAJq5BAvY0g9GAAAAAElFTkSuQmCC';
const file = new File([Buffer.from(PIXEL_PNG_B64, 'base64')], 'sample.png', { type: 'image/png' });

console.log(`→ Connecting to ${SPACE}…`);
const t0 = Date.now();
const client = await Client.connect(SPACE, {
  status_callback: (s) => console.log(`   [${s.status}]`, s.detail || ''),
});
console.log(`   ✓ connected (${Date.now() - t0}ms)`);

const PROMPT = 'a clean studio product photo of this clothing item, white background, even lighting, no shadows, no wrinkles';

let result;
try {
  if (SPACE === 'fffiloni/InstantIR') {
    result = await client.predict('/InstantIR', {
      lq: handle_file(file),
      prompt: PROMPT,
      steps: 20,
      cfg_scale: 7,
      guidance_end: 0.6,
      creative_restoration: 0.5,
    });
  } else if (SPACE === 'finegrain/finegrain-image-enhancer') {
    result = await client.predict('/process', {
      input_image: handle_file(file),
      prompt: PROMPT,
      negative_prompt: 'blurry, ugly, deformed',
      seed: 42,
      upscale_factor: 1,
      controlnet_scale: 0.6,
    });
  } else {
    throw new Error('unknown space');
  }
  console.log(`   ✓ predict success (${Date.now() - t0}ms total)`);
  const data = result.data;
  console.log('   data preview:', JSON.stringify(data).slice(0, 400));
} catch (err) {
  console.error(`   ❌ predict failed: ${err.message}`);
}
