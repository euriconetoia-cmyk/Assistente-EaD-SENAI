'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const output = path.join(root, 'CHECKSUMS.sha256');
const ignored = new Set(['.git', 'node_modules', 'coverage', 'dist']);
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (ignored.has(entry.name)) return [];
  const file = path.join(directory, entry.name);
  if (entry.isDirectory()) return walk(file);
  if (!entry.isFile() || file === output || /\.(?:zip|log)$/.test(entry.name)) return [];
  return [file];
});
const lines = walk(root).map((file) => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const relative = path.relative(root, file).split(path.sep).join('/');
  return `${digest}  ./${relative}`;
}).sort((left, right) => left.slice(66).localeCompare(right.slice(66), 'en'));
const actual = `${lines.join('\n')}\n`;

if (process.argv.includes('--write')) {
  fs.writeFileSync(output, actual);
  console.log(`Checksums atualizados para ${lines.length} arquivos.`);
} else if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== actual) {
  console.error('CHECKSUMS.sha256 não corresponde aos arquivos atuais. Execute npm run checksums e revise a diferença.');
  process.exitCode = 1;
} else {
  console.log(`Integridade confirmada para ${lines.length} arquivos.`);
}
