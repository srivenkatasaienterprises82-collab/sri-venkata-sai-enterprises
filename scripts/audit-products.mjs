import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const productsPath = resolve(ROOT, 'src', 'lib', 'data', 'products.ts');

const content = readFileSync(productsPath, 'utf8');

// Parse products
const products = [];
let current = null;

for (const line of content.split('\n')) {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('p({')) {
    current = { 
      id: '', name: '', brand: '', brandSlug: '',
      colors: [], ramOptions: [], storageOptions: [],
      hasColors: false, hasRam: false, hasStorage: false, hasVariants: false 
    };
    continue;
  }
  
  if (current) {
    const idMatch = trimmed.match(/id:\s*"([^"]+)"/);
    if (idMatch) current.id = idMatch[1];
    
    const nameMatch = trimmed.match(/name:\s*"([^"]+)"/);
    if (nameMatch) current.name = nameMatch[1];
    
    const brandMatch = trimmed.match(/brand:\s*"([^"]+)"/);
    if (brandMatch) current.brand = brandMatch[1];
    
    const brandSlugMatch = trimmed.match(/brandSlug:\s*"([^"]+)"/);
    if (brandSlugMatch) current.brandSlug = brandSlugMatch[1];
    
    if (trimmed.includes('colors:')) {
      current.hasColors = true;
      const colorsMatch = trimmed.match(/colors:\s*\[([^\]]+)\]/);
      if (colorsMatch) {
        current.colors = colorsMatch[1].split(',').map(c => {
          c = c.trim();
          const m = c.match(/C\.(\w+)/);
          return m ? m[1] : c.replace(/"/g, '');
        }).filter(c => c);
      }
    }
    
    if (trimmed.includes('ramOptions:')) {
      current.hasRam = true;
      const ramMatch = trimmed.match(/ramOptions:\s*\[([^\]]*)\]/);
      if (ramMatch) {
        current.ramOptions = ramMatch[1].split(',').map(r => r.trim().replace(/"/g, '')).filter(r => r);
      }
    }
    
    if (trimmed.includes('storageOptions:')) {
      current.hasStorage = true;
      const storageMatch = trimmed.match(/storageOptions:\s*\[([^\]]*)\]/);
      if (storageMatch) {
        current.storageOptions = storageMatch[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(s => s);
      }
    }
    
    if (trimmed.includes('variants:')) current.hasVariants = true;
    
    if (trimmed === '}),' || trimmed === '})') {
      if (current.id) products.push({ ...current });
      current = null;
    }
  }
}

console.log('=== AUDIT: PRODUCT VARIANTS & COLORS ===');
console.log('Total products found:', products.length);
console.log('');

// By brand summary
const byBrand = {};
for (const p of products) {
  if (!byBrand[p.brandSlug]) {
    byBrand[p.brandSlug] = { 
      brand: p.brand, total: 0, 
      complete: 0, incomplete: []
    };
  }
  const b = byBrand[p.brandSlug];
  b.total++;
  
  const problems = [];
  if (!p.hasColors) problems.push('no colors');
  if (!p.hasRam) problems.push('no RAM options');
  if (!p.hasStorage) problems.push('no storage options');
  if (!p.hasVariants) problems.push('no variants');
  
  if (problems.length) {
    b.incomplete.push({ name: p.name, problems: problems.join(', ') });
  } else {
    b.complete++;
  }
}

const sorted = Object.entries(byBrand).sort((a, b) => b[1].total - a[1].total);
for (const [slug, b] of sorted) {
  const status = b.incomplete.length === 0 ? '✓ ALL COMPLETE' : `⚠ ${b.incomplete.length} need fixes`;
  console.log(`${b.brand} (${slug}): ${b.total} products — ${status}`);
  if (b.incomplete.length) {
    for (const item of b.incomplete) {
      console.log(`   ✗ ${item.name}: ${item.problems}`);
    }
  }
}

console.log('\n\n=== PRODUCTS MISSING DATA (details) ===');
console.log('ID'.padEnd(28) + 'NAME'.padEnd(30) + 'COLORS'.padEnd(25) + 'RAM'.padEnd(20) + 'STORAGE'.padEnd(20) + 'VARIANTS');
console.log('-'.repeat(123));

let totalIssues = 0;
for (const p of products) {
  const colors = p.hasColors ? '✓ ' + p.colors.join(',') : '✗ MISSING';
  const ram = p.hasRam ? '✓ ' + p.ramOptions.join(',') : '✗ MISSING';
  const storage = p.hasStorage ? '✓ ' + p.storageOptions.join(',') : '✗ MISSING';
  const variants = p.hasVariants ? '✓' : '✗';
  console.log(p.id.padEnd(28) + p.name.padEnd(30) + colors.padEnd(25) + ram.padEnd(20) + storage.padEnd(20) + variants);
  
  const problems = [];
  if (!p.hasColors) problems.push('colors');
  if (!p.hasRam) problems.push('RAM');
  if (!p.hasStorage) problems.push('storage');
  if (!p.hasVariants) problems.push('variants');
  if (problems.length) totalIssues++;
}

console.log(`\nTotal products with issues: ${totalIssues}/${products.length}`);
