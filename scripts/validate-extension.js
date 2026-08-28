'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(manifest.manifest_version === 3, 'manifest_version deve ser 3');
check(manifest.version === '3.6.6', 'versão deve ser 3.6.6');
check(manifest.name.length <= 45, 'nome excede 45 caracteres');
check(manifest.description.length <= 132, 'descrição excede 132 caracteres');
check(!manifest.permissions.includes('tabs'), 'permissão tabs é desnecessária');
check(manifest.permissions.includes('alarms') && manifest.permissions.includes('storage'), 'permissões obrigatórias ausentes');
check(Boolean(manifest.content_security_policy?.extension_pages), 'CSP explícita ausente');

const referenced = [manifest.background.service_worker];
for (const entry of manifest.content_scripts) referenced.push(...(entry.js || []), ...(entry.css || []));
for (const icon of Object.values(manifest.icons || {})) referenced.push(icon);
for (const file of referenced) check(fs.existsSync(path.join(root, file)), `arquivo referenciado ausente: ${file}`);

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});
const sourceFiles = walk(root).filter((file) => /\.(js|json|css|md)$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`));
for (const file of sourceFiles.filter((item) => item.endsWith('.js'))) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch { failures.push(`sintaxe JavaScript inválida: ${path.relative(root, file)}`); }
}

const runtimeSource = sourceFiles.filter((file) => file.endsWith('.js') && !file.includes(`${path.sep}tests${path.sep}`)).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
check(!/\beval\s*\(|new Function\s*\(/.test(runtimeSource), 'execução dinâmica de código detectada');
check(!/<script[^>]+src=["']https?:/i.test(runtimeSource), 'script remoto detectado');
check(fs.existsSync(path.join(root, 'PRIVACIDADE.md')), 'documento de privacidade ausente');
for (const relative of ['background/service-worker.js', 'content/main.js', 'content/batch-grading.js', 'content/importer/contextual-importer.js']) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  check(/onMessage\.addListener/.test(source) && /sender\?\.id !== chrome\.runtime\.id/.test(source), `validação de origem ausente em ${relative}`);
}
for (const cssFile of sourceFiles.filter((file) => file.endsWith('.css'))) {
  const css = fs.readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const character of css) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) break;
  }
  check(depth === 0, `chaves CSS desequilibradas: ${path.relative(root, cssFile)}`);
}

if (failures.length) {
  console.error(`Validação falhou com ${failures.length} problema(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Validação concluída: ${referenced.length} referências, ${sourceFiles.length} arquivos e nenhuma falha estrutural.`);
