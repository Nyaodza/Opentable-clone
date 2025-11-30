/**
 * Icon Generation Script for OpenTable Clone PWA
 * 
 * Run this script to generate all required PNG icons from the SVG source.
 * 
 * Prerequisites:
 *   npm install sharp
 * 
 * Usage:
 *   node generate-icons.js
 * 
 * This will generate all required icon sizes for:
 * - PWA manifest icons
 * - Apple touch icons
 * - Favicon
 * - Shortcut icons
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [
  { name: 'icon-16x16.png', size: 16 },
  { name: 'icon-32x32.png', size: 32 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.ico', size: 32 },
];

const shortcutIcons = [
  { name: 'search-96x96.png', size: 96, color: '#3b82f6' },
  { name: 'reservations-96x96.png', size: 96, color: '#10b981' },
  { name: 'favorites-96x96.png', size: 96, color: '#ef4444' },
];

async function generateIcons() {
  const svgPath = path.join(__dirname, 'icon.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  console.log('Generating PWA icons...');

  for (const { name, size } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(__dirname, name));
      console.log(`  ✓ Generated ${name}`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\nIcon generation complete!');
  console.log('Note: For shortcut icons, you may want to create custom designs.');
}

generateIcons().catch(console.error);


