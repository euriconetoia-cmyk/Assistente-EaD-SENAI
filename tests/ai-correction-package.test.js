'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const batchSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'batch-grading.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(__dirname, '..', 'content', 'ui.js'), 'utf8');

test('lote para IA inclui contexto verificável de cada atividade', () => {
  assert.match(uiSource, /Baixar pacote para correção com IA/);
  assert.match(batchSource, /enunciado_da_atividade\.txt/);
  assert.match(batchSource, /criterios_de_avaliacao\.txt/);
  assert.match(batchSource, /dados_da_atividade\.txt/);
  assert.match(batchSource, /criterios_de_pontuacao\.txt/);
  assert.match(batchSource, /envios_pendentes\/manifesto_pendencias\.csv/);
  assert.match(batchSource, /collectPendingSubmissionEntries/);
  assert.doesNotMatch(batchSource, /envios_dos_alunos\.zip/);
  assert.match(batchSource, /manifesto_atividade\.csv/);
  assert.match(batchSource, /Nota máxima não localizada/);
  assert.match(batchSource, /buildAssignmentGradingUrl/);
  assert.match(batchSource, /não invente essa informação/i);
});

test('lote para IA gera pacote mestre com pastas independentes por atividade', () => {
  assert.match(batchSource, /function buildAiActivityPackageEntries/);
  assert.match(batchSource, /function buildMasterPackageEntries/);
  assert.match(batchSource, /function splitActivityBundles/);
  assert.match(batchSource, /Este pacote corresponde a uma única atividade/);
  assert.match(batchSource, /pacote_mestre_correcao_ia_\$\{courseSlug\}/);
  assert.match(batchSource, /manifesto_geral\.csv/);
  assert.match(batchSource, /MAX_AI_MASTER_PACKAGE_BYTES = 450 \* 1024 \* 1024/);
  assert.match(batchSource, /MAX_AI_SINGLE_ACTIVITY_BYTES = 500 \* 1024 \* 1024/);
  assert.doesNotMatch(batchSource, /O pacote ultrapassou 100 MB\. Baixe as atividades em grupos menores/);
  assert.doesNotMatch(batchSource, /MAX_AI_PACKAGE_BYTES/);
});

test('gerador compartilhado produz ZIP local com nomes UTF-8', async () => {
  const MAT = {};
  const context = vm.createContext({ MAT, Blob, TextEncoder, URL, location: new URL('https://ead.senai.br/course/view.php?id=1'), setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'utils.js'), 'utf8'), context);
  const blob = MAT.utils.makeZipBlob([{ name: 'atividade/enunciado_da_atividade.txt', content: 'Avalie a solução apresentada.' }]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.ok(new TextDecoder().decode(bytes).includes('enunciado_da_atividade.txt'));
});

test('anexo do professor é incluído e envio de aluno com nome parecido é ignorado', async () => {
  const pageUrl = 'https://ead.senai.br/mod/assign/view.php?id=335663';
  const teacherUrl = 'https://ead.senai.br/pluginfile.php/11/mod_assign/introattachment/0/Envio%20SAP%2001.pdf';
  const studentUrl = 'https://ead.senai.br/pluginfile.php/11/assignsubmission_file/submission_files/0/Envio%20SAP%2001.pdf';
  const doc = { querySelectorAll: () => [teacherUrl, studentUrl].map((href) => ({ getAttribute: () => href, closest: () => null })) };
  const MAT = {};
  const bytes = new Uint8Array([37, 80, 68, 70]);
  const context = vm.createContext({
    MAT, URL, Blob, TextEncoder, Uint8Array, AbortController, setTimeout, clearTimeout,
    location: new URL(pageUrl),
    fetch: async (url) => ({
      url, ok: true, headers: { get: (name) => name === 'content-type' ? 'application/pdf' : '4' },
      arrayBuffer: async () => bytes.buffer,
    }),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'utils.js'), 'utf8'), context);
  const candidates = MAT.utils.findAssignmentAttachments(doc, pageUrl);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].name, 'Envio SAP 01.pdf');
  const result = await MAT.utils.fetchAssignmentAttachments(doc, pageUrl);
  assert.equal(result.files.length, 1);
  assert.deepEqual([...result.files[0].bytes], [...bytes]);
});

test('pacote para IA reconhece enunciado presente apenas na tela de avaliação', () => {
  const start = batchSource.indexOf('  const safeText =');
  const end = batchSource.indexOf('  async function fetchMoodleResource(', start);
  const source = batchSource.slice(start, end);
  const noDescription = { body: { textContent: '' }, querySelector: () => null, querySelectorAll: () => [] };
  const gradingDoc = { ...noDescription, querySelector: () => ({ textContent: 'Explique os passos da SAP 01.' }) };
  const context = vm.createContext({
    U: { cleanText: (value) => value.trim(), normalizeText: (value) => value.toLowerCase() },
    S: { parseGrade: () => ({ valid: false }) },
  });
  const extract = vm.runInContext(`${source}\nextractAssignmentContext`, context);
  const result = extract(noDescription, { cmid: 335663 }, gradingDoc);
  assert.equal(result.description, 'Explique os passos da SAP 01.');
  assert.ok(!result.warnings.some((warning) => warning.includes('Enunciado não localizado')));
});

test('recurso SAP do cartão do curso é associado apenas à tarefa da mesma seção', () => {
  const html = '<div class="activity-item focus-control" data-activityname="SAP 01" data-region="activity-card"><div class="activitytitle modtype_resource"><a href="https://ead.senai.br/mod/resource/view.php?id=336353"><span class="instancename">SAP 01 <span class="accesshide">Arquivo</span></span></a></div></div>';
  const title = html.match(/data-activityname="([^"]+)"/)?.[1];
  const href = html.match(/href="([^"]+\/mod\/resource\/view\.php\?id=\d+)"/)?.[1];
  const MAT = { utils: { normalizeText: (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(), isAllowedMoodleUrl: () => true } };
  const context = vm.createContext({ globalThis: null, MAT, URL, location: new URL('https://ead.senai.br/course/view.php?id=11225') });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'statement-resources.js'), 'utf8'), context);
  const sections = [
    { id: 'section-1', name: 'Cabeamento Estruturado', activities: [{ cmid: 336353, name: title, moduleType: 'resource', url: href }] },
    { id: 'section-2', name: 'Cabeamento Estruturado', activities: [{ cmid: 336999, name: 'SAP 01', moduleType: 'resource', url: 'https://ead.senai.br/mod/resource/view.php?id=336999' }] }
  ];
  const assignment = { cmid: 335663, name: 'Envio da SAP 01', sectionId: 'section-1', sectionName: 'Cabeamento Estruturado' };
  const found = MAT.statementResources.matchingResources(sections, assignment);
  assert.deepEqual(Array.from(found, (item) => item.cmid), [336353]);
  assert.equal(MAT.statementResources.matchingResources(sections, { ...assignment, sectionId: '' }).length, 0);
  assert.equal(MAT.statementResources.matchingResources(sections, { ...assignment, sectionId: '', sectionName: '' }).length, 0);
  assert.equal(MAT.statementResources.matchingResources(sections, { ...assignment, name: 'Envio da SAP 02' }).length, 0);
});

test('recurso SAP redirecionado a PDF é incluído; HTML externo é recusado', async () => {
  const fileUrl = 'https://ead.senai.br/pluginfile.php/510/mod_resource/content/1/SAP%2001.pdf';
  const pdf = new Uint8Array([37, 80, 68, 70, 45]);
  const resources = [{ cmid: 336353, url: 'https://ead.senai.br/mod/resource/view.php?id=336353', name: 'SAP 01' }];
  const MAT = { utils: { normalizeText: (value) => String(value).toLowerCase(), isAllowedMoodleUrl: () => true } };
  const context = vm.createContext({ globalThis: null, MAT, URL, Uint8Array, AbortController, setTimeout, clearTimeout, location: new URL('https://ead.senai.br/course/view.php?id=11225'), fetch: async () => ({ ok: true, url: fileUrl, headers: { get: (key) => key === 'content-type' ? 'application/pdf' : key === 'content-length' ? String(pdf.length) : null }, arrayBuffer: async () => pdf.buffer }) });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'statement-resources.js'), 'utf8'), context);
  const file = await MAT.statementResources.fetchStatementResource(resources[0]);
  assert.equal(file.name, 'SAP 01.pdf');
  assert.deepEqual([...file.bytes], [...pdf]);
  context.fetch = async () => ({ ok: true, url: 'https://example.org/SAP%2001.pdf', headers: { get: () => 'application/pdf' } });
  await assert.rejects(MAT.statementResources.fetchStatementResource(resources[0]), /redirecionamento não autorizado/);
});

test('página HTML do recurso SAP só segue arquivo mod_resource da mesma origem', async () => {
  const MAT = { utils: { normalizeText: (value) => String(value).toLowerCase(), isAllowedMoodleUrl: () => true } };
  const resource = { cmid: 336353, name: 'SAP 01', url: 'https://ead.senai.br/mod/resource/view.php?id=336353' };
  const url = 'https://ead.senai.br/pluginfile.php/510/mod_resource/content/1/SAP_01.docx';
  const docx = new Uint8Array([80, 75, 3, 4]);
  const calls = [];
  const context = vm.createContext({ globalThis: null, MAT, URL, Uint8Array, AbortController, setTimeout, clearTimeout, location: new URL('https://ead.senai.br/course/view.php?id=11225'),
    DOMParser: class { parseFromString() { return { querySelectorAll: () => [{ getAttribute: (name) => name === 'href' ? url : null }] }; } },
    fetch: async (requested) => {
      calls.push(requested);
      if (calls.length === 1) return { ok: true, url: resource.url, headers: { get: (name) => name === 'content-type' ? 'text/html' : null }, text: async () => '<a href="' + url + '">Baixar SAP</a>' };
      return { ok: true, url, headers: { get: (name) => name === 'content-type' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : null }, arrayBuffer: async () => docx.buffer };
    } });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'content', 'statement-resources.js'), 'utf8'), context);
  const result = await MAT.statementResources.fetchStatementResource(resource);
  assert.equal(calls[1], url);
  assert.equal(result.name, 'SAP_01.docx');
  assert.match(batchSource, /arquivos_sap_da_uc\/\$\{fileIndex \+ 1\}_\$\{file\.cmid\}_\$\{file\.name\}/);
});

test('pacote mestre inclui o PDF SAP ao lado dos envios quando a tarefa não tem enunciado em texto', async () => {
  const root = path.join(__dirname, '..');
  const location = new URL('https://ead.senai.br/course/view.php?id=11225');
  const saved = [];
  const MAT = { state: { snapshot: {
    course: { id: 11225, name: 'Cabeamento Estruturado', sections: [] },
    activityPanorama: { assignments: [{ cmid: 335663, name: 'Envio da SAP 01', url: 'https://ead.senai.br/mod/assign/view.php?id=335663', sectionId: 'section-1', sectionName: 'Cabeamento Estruturado', metrics: { pending: 1 }, gradingRows: [] }] }
  } }, ui: { toast: () => {} }, assistedGrading: { AGENT_MARKDOWN: 'Revisar antes de corrigir.' }, dom: {},
  utils: null };
  MAT.state.adapter = {
    extractSections: () => [{ id: 'section-1', name: 'Cabeamento Estruturado', activities: [{ cmid: 336353, name: 'SAP 01', moduleType: 'resource', url: 'https://ead.senai.br/mod/resource/view.php?id=336353' }] }],
    extractAssignmentGradingRows: () => ({ rows: [{ studentName: 'Aluno Pendente', studentKey: 'id:10', submitted: true, graded: false, requiresGrading: true, missing: false, statusText: 'Enviado para avaliação', files: [{ name: 'resposta.pdf', url: 'https://ead.senai.br/pluginfile.php/999/assignsubmission_file/submission_files/1/resposta.pdf' }] }] })
  };
  const doc = { body: { textContent: 'Nota máxima: 100' }, querySelector: () => null, querySelectorAll: () => [] };
  const context = vm.createContext({ globalThis: null, MAT, URL, Blob, TextEncoder, TextDecoder, Uint8Array, AbortController, setTimeout, clearTimeout, location,
    DOMParser: class { parseFromString() { return doc; } },
    chrome: { runtime: { id: 'test', onMessage: { addListener: () => {} } } },
    fetch: async (url) => {
      const value = String(url);
      if (value.includes('/mod/resource/')) return { ok: true, url: 'https://ead.senai.br/pluginfile.php/510/mod_resource/content/1/SAP%2001.pdf', headers: { get: (name) => name === 'content-type' ? 'application/pdf' : null }, arrayBuffer: async () => Uint8Array.from([37, 80, 68, 70]).buffer };
      if (value.includes('assignsubmission_file')) return { ok: true, url: value, headers: { get: (name) => name === 'content-type' ? 'application/pdf' : null }, arrayBuffer: async () => Uint8Array.from([37, 80, 68, 70]).buffer };
      return { ok: true, url: value, headers: { get: () => 'text/html' }, text: async () => '<html>Nota máxima: 100</html>' };
    }
  });
  context.globalThis = context;
  context.MAT_SHARED = { neutralizeSpreadsheetFormula: (value) => String(value ?? ''), parseGrade: (value) => ({ valid: /^\d+$/.test(String(value)), number: Number(value) }) };
  vm.runInContext(fs.readFileSync(path.join(root, 'content/utils.js'), 'utf8'), context);
  MAT.utils.downloadBlob = (blob, name) => saved.push({ blob, name });
  vm.runInContext(fs.readFileSync(path.join(root, 'content/statement-resources.js'), 'utf8'), context);
  vm.runInContext(batchSource, context);
  await MAT.batchGrading.downloadAllForCorrection();
  assert.equal(saved.length, 1);
  const zip = new TextDecoder().decode(new Uint8Array(await saved[0].blob.arrayBuffer()));
  assert.match(zip, /arquivos_sap_da_uc\/1_336353_SAP 01\.pdf/);
  assert.match(zip, /envios_pendentes\/Aluno Pendente\/1_resposta\.pdf/);
  assert.match(zip, /envios_pendentes\/manifesto_pendencias\.csv/);
  assert.match(zip, /tela de avaliação consultada agora/);
  assert.match(zip, /arquivo associado, conferir/);
});
