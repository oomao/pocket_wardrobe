// One-shot probe: actually call yisol/IDM-VTON or levihsu/OOTDiffusion via
// @gradio/client (anonymous, no token) to verify the public endpoint is
// reachable and accepts our parameter shape. Run with `node scripts/probe-tryon.mjs`.

import { Client, handle_file } from '@gradio/client';
import fs from 'node:fs';

const SPACE = process.argv[2] || 'levihsu/OOTDiffusion';

// Minimal valid PNG (1×1 transparent pixel) so the upload pipeline has
// something to send. The model will probably hate it but at least we can
// see whether the API accepts the call shape.
const PIXEL_BUF = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const personFile = new File([PIXEL_BUF], 'person.png', { type: 'image/png' });
const garmFile = new File([PIXEL_BUF], 'garment.png', { type: 'image/png' });

console.log(`→ Connecting to ${SPACE}…`);
const t0 = Date.now();
let client;
try {
  client = await Client.connect(SPACE, {
    status_callback: (status) => {
      console.log(`   [status] ${JSON.stringify(status)}`);
    },
  });
  console.log(`   connected in ${Date.now() - t0}ms`);
} catch (err) {
  console.error('   ❌ connect failed:', err.message);
  process.exit(1);
}

console.log('→ Endpoints exposed:', Object.keys(client.config?.dependencies || {}));

if (SPACE === 'levihsu/OOTDiffusion') {
  console.log('→ Calling /process_hd …');
  try {
    const t1 = Date.now();
    const result = await client.predict('/process_hd', {
      vton_img: handle_file(personFile),
      garm_img: handle_file(garmFile),
      n_samples: 1,
      n_steps: 20,
      image_scale: 2,
      seed: 42,
    });
    console.log(`   ✓ predict resolved in ${Date.now() - t1}ms`);
    console.log('   result keys:', Object.keys(result));
    console.log('   data preview:', JSON.stringify(result.data).slice(0, 400));
  } catch (err) {
    console.error('   ❌ predict failed:', err.message);
  }
} else if (SPACE === 'yisol/IDM-VTON') {
  console.log('→ Calling /tryon …');
  try {
    const t1 = Date.now();
    const result = await client.predict('/tryon', {
      dict: { background: handle_file(personFile), layers: [], composite: null },
      garm_img: handle_file(garmFile),
      garment_des: 'a t-shirt',
      is_checked: true,
      is_checked_crop: false,
      denoise_steps: 20,
      seed: 42,
    });
    console.log(`   ✓ predict resolved in ${Date.now() - t1}ms`);
    console.log('   result keys:', Object.keys(result));
    console.log('   data preview:', JSON.stringify(result.data).slice(0, 400));
  } catch (err) {
    console.error('   ❌ predict failed:', err.message);
  }
}
