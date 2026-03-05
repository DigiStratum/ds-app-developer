/**
 * Build script for ds-icons
 * Generates icons.css with mask-image references for each SVG
 */

const fs = require('fs');
const path = require('path');

const SVG_DIR = path.join(__dirname, '..', 'svg');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const OUTPUT_CSS = path.join(DIST_DIR, 'icons.css');
const OUTPUT_SVG_DIR = path.join(DIST_DIR, 'svg');

// Ensure dist directories exist
fs.mkdirSync(DIST_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_SVG_DIR, { recursive: true });

// Get all SVG files
const svgFiles = fs.readdirSync(SVG_DIR)
  .filter(f => f.endsWith('.svg'))
  .sort();

// Convert filename to CSS class name (kebab-case)
function toClassName(filename) {
  return filename.replace('.svg', '');
}

// Read SVG content and convert to data URI for inlining
function svgToDataUri(svgContent) {
  // Clean up SVG for data URI
  const cleaned = svgContent
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .trim();
  return `url("data:image/svg+xml,${encodeURIComponent(cleaned)}")`;
}

// Generate CSS
let css = `/**
 * @digistratum/ds-icons
 * CSS-based icon system using mask-image
 * Generated from Heroicons (MIT License)
 * 
 * Usage:
 *   <span class="ds-icon ds-icon-sun"></span>
 *   <i class="ds-icon ds-icon-moon"></i>
 * 
 * Icons inherit text color via currentColor.
 * Size defaults to 1.25rem; override with w-* h-* or custom CSS.
 */

/* Base icon styles */
.ds-icon {
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  background-color: currentColor;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  vertical-align: middle;
  flex-shrink: 0;
}

/* Size variants */
.ds-icon-xs { width: 0.75rem; height: 0.75rem; }
.ds-icon-sm { width: 1rem; height: 1rem; }
.ds-icon-md { width: 1.25rem; height: 1.25rem; }
.ds-icon-lg { width: 1.5rem; height: 1.5rem; }
.ds-icon-xl { width: 2rem; height: 2rem; }

/* Individual icon mappings */
`;

for (const file of svgFiles) {
  const className = toClassName(file);
  const svgPath = path.join(SVG_DIR, file);
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const dataUri = svgToDataUri(svgContent);
  
  css += `.ds-icon-${className} {
  -webkit-mask-image: ${dataUri};
  mask-image: ${dataUri};
}
`;

  // Also copy SVG to dist for external reference if needed
  fs.copyFileSync(svgPath, path.join(OUTPUT_SVG_DIR, file));
}

// Write CSS
fs.writeFileSync(OUTPUT_CSS, css, 'utf8');

console.log(`✓ Generated ${OUTPUT_CSS}`);
console.log(`✓ ${svgFiles.length} icons processed`);
console.log(`✓ SVGs copied to ${OUTPUT_SVG_DIR}`);
