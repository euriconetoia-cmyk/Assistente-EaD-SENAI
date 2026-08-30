'use strict';

(() => {
  const text = (value) => String(value ?? '');
  const htmlEscape = (value) => text(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const csvCell = (value) => {
    const raw = text(value);
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const dateTime = (value) => value ? new Date(value).toLocaleString('pt-BR') : 'Não identificada';
  const encoder = new TextEncoder();

  const sha256 = async (blob) => {
    const bytes = blob instanceof Blob ? await blob.arrayBuffer() : encoder.encode(text(blob));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const eventLabel = (type) => ({
    'analysis.started': 'Atualização iniciada',
    'analysis.completed': 'Atualização concluída',
    'analysis.partial': 'Atualização parcial',
    'package.exported': 'Pacote para IA exportado',
    'import.loaded': 'Arquivo de notas carregado',
    'import.validated': 'Importação validada',
    'review.completed': 'Conferência anterior concluída',
    'grade.save.started': 'Salvamento iniciado',
    'grade.save.completed': 'Salvamento concluído',
    'grade.save.partial': 'Salvamento parcial',
    'grade.verify.completed': 'Verificação posterior concluída',
    'message.opened': 'Mensagem preparada no AVA',
    'report.exported': 'Relatório exportado',
    'evidence.exported': 'Evidências exportadas',
    'error.operational': 'Falha operacional',
    'action.recorded': 'Ação registrada'
  }[type] || type || 'Ação registrada');

  const makeCsv = (events) => {
    const headers = ['id', 'data_hora', 'evento', 'resultado', 'ambiente', 'curso_id', 'curso', 'uc', 'atividade_id', 'atividade', 'origem', 'quantidades', 'descricao'];
    const rows = events.map((event) => [event.eventId, event.createdAt, eventLabel(event.eventType), event.result, event.environment, event.courseId, event.courseName, event.ucName, event.activityId, event.activityName, event.source, JSON.stringify(event.counts || {}), event.message]);
    return '\ufeff' + [headers, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
  };

  const makeHtml = ({ events, generatedAt, filters, includeAcademic }) => {
    const rows = events.length ? events.map((event) => `<tr><td>${htmlEscape(dateTime(event.createdAt))}</td><td>${htmlEscape(eventLabel(event.eventType))}</td><td>${htmlEscape(event.courseName || event.courseId || '')}</td><td>${htmlEscape(event.ucName || '')}</td><td>${htmlEscape(event.result || 'info')}</td><td>${htmlEscape(event.message || '')}</td></tr>`).join('') : '<tr><td colspan="6">Nenhum evento corresponde ao período selecionado.</td></tr>';
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório de evidências</title><style>body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#162238;margin:32px}h1{color:#0b5cad;margin-bottom:4px}.meta{display:grid;grid-template-columns:180px 1fr;gap:8px 14px;padding:16px;border-radius:10px;background:#f3f6fa}.meta strong{color:#073b70}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:9px;border:1px solid #cbd5e1;text-align:left;vertical-align:top}th{background:#073b70;color:#fff}tbody tr:nth-child(even){background:#f8fafc}.note{margin-top:20px;color:#5b6880}@media print{body{margin:10mm}thead{display:table-header-group}}</style></head><body><h1>Auditoria Local do Assistente EaD SENAI</h1><p>Evidências operacionais geradas e armazenadas localmente.</p><section class="meta"><strong>Gerado em</strong><span>${htmlEscape(dateTime(generatedAt))}</span><strong>Versão</strong><span>3.7.0</span><strong>Eventos</strong><span>${events.length}</span><strong>Período</strong><span>${htmlEscape(filters.period || 'Todos os registros')}</span><strong>Dados individuais</strong><span>${includeAcademic ? 'Incluídos mediante confirmação' : 'Não incluídos'}</span></section><table><thead><tr><th>Data e hora</th><th>Ação</th><th>Curso</th><th>UC</th><th>Resultado</th><th>Evidência</th></tr></thead><tbody>${rows}</tbody></table><p class="note">Este relatório reproduz os registros disponíveis no navegador no momento da exportação. Use a impressão do navegador para gerar uma cópia em PDF.</p></body></html>`;
  };

  const createFile = (name, content, type) => ({ name, type, blob: content instanceof Blob ? content : new Blob([content], { type }) });

  const buildFiles = async ({ events, payload, filters = {}, includeAcademic = false }) => {
    const generatedAt = new Date().toISOString();
    const safePayload = {
      schemaVersion: 1,
      extensionVersion: '3.7.0',
      generatedAt,
      filters,
      privacy: { includesIndividualAcademicData: includeAcademic },
      events,
      inventory: includeAcademic ? payload : {
        generatedAt: payload?.generatedAt || null,
        inventoryPartial: Boolean(payload?.inventoryPartial),
        courseCount: payload?.courses?.length || 0,
        pendingCount: (payload?.courses || []).reduce((total, course) => total + (Number(course.totalPending) || 0), 0)
      }
    };
    const readme = ['PACOTE DE EVIDÊNCIAS DO ASSISTENTE EAD SENAI', '', `Gerado em: ${generatedAt}`, 'Versão: 3.7.0', `Eventos: ${events.length}`, `Dados acadêmicos individuais: ${includeAcademic ? 'incluídos mediante confirmação' : 'não incluídos'}`, '', 'Arquivos:', '- relatorio_evidencias.html: relatório visual e imprimível.', '- historico_acoes.csv: eventos em formato tabular.', '- auditoria_completa.json: estrutura técnica versionada.', '- manifesto_arquivos.json: descrição e hashes dos arquivos.', '- CHECKSUMS.sha256: verificação de integridade.', '', 'Todos os arquivos foram gerados localmente. Nenhum dado foi enviado para servidor externo.'].join('\n');
    const files = [
      createFile('LEIA-ME.txt', readme, 'text/plain;charset=utf-8'),
      createFile('relatorio_evidencias.html', makeHtml({ events, generatedAt, filters, includeAcademic }), 'text/html;charset=utf-8'),
      createFile('historico_acoes.csv', makeCsv(events), 'text/csv;charset=utf-8'),
      createFile('auditoria_completa.json', JSON.stringify(safePayload, null, 2), 'application/json;charset=utf-8')
    ];
    const items = [];
    for (const file of files) items.push({ name: file.name, type: file.type, size: file.blob.size, sha256: await sha256(file.blob) });
    const manifest = { schemaVersion: 1, generatedAt, extensionVersion: '3.7.0', complete: true, files: items };
    const manifestFile = createFile('manifesto_arquivos.json', JSON.stringify(manifest, null, 2), 'application/json;charset=utf-8');
    files.push(manifestFile);
    const checksums = [...items, { name: manifestFile.name, sha256: await sha256(manifestFile.blob) }].map((item) => `${item.sha256}  ${item.name}`).join('\n') + '\n';
    files.push(createFile('CHECKSUMS.sha256', checksums, 'text/plain;charset=utf-8'));
    return { generatedAt, files };
  };

  const zipCrcTable = (() => { const table = new Uint32Array(256); for (let index = 0; index < 256; index += 1) { let value = index; for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1; table[index] = value >>> 0; } return table; })();
  const crc32 = (bytes) => { let value = 0xffffffff; for (const byte of bytes) value = (value >>> 8) ^ zipCrcTable[(value ^ byte) & 0xff]; return (value ^ 0xffffffff) >>> 0; };
  const write16 = (target, offset, value) => { target[offset] = value & 0xff; target[offset + 1] = (value >>> 8) & 0xff; };
  const write32 = (target, offset, value) => { write16(target, offset, value & 0xffff); write16(target, offset + 2, value >>> 16); };
  const makeZip = async (files) => {
    const now = new Date(); const year = Math.max(1980, now.getFullYear()); const dosDate = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(); const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    let offset = 0; const localParts = []; const directoryParts = [];
    for (const file of files) {
      const name = encoder.encode(file.name); const bytes = new Uint8Array(await file.blob.arrayBuffer()); const checksum = crc32(bytes);
      const header = new Uint8Array(30 + name.length); write32(header, 0, 0x04034b50); write16(header, 4, 20); write16(header, 6, 0x0800); write16(header, 10, dosTime); write16(header, 12, dosDate); write32(header, 14, checksum); write32(header, 18, bytes.length); write32(header, 22, bytes.length); write16(header, 26, name.length); header.set(name, 30); localParts.push(header, bytes);
      const directory = new Uint8Array(46 + name.length); write32(directory, 0, 0x02014b50); write16(directory, 4, 20); write16(directory, 6, 20); write16(directory, 8, 0x0800); write16(directory, 12, dosTime); write16(directory, 14, dosDate); write32(directory, 16, checksum); write32(directory, 20, bytes.length); write32(directory, 24, bytes.length); write16(directory, 28, name.length); write32(directory, 42, offset); directory.set(name, 46); directoryParts.push(directory); offset += header.length + bytes.length;
    }
    const directoryLength = directoryParts.reduce((total, part) => total + part.length, 0); const end = new Uint8Array(22); write32(end, 0, 0x06054b50); write16(end, 8, files.length); write16(end, 10, files.length); write32(end, 12, directoryLength); write32(end, 16, offset);
    return new Blob([...localParts, ...directoryParts, end], { type: 'application/zip' });
  };

  const downloadZip = async (files, filename) => {
    const blob = await makeZip(files); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); return filename;
  };

  globalThis.MAT_AUDIT_EXPORT = { eventLabel, buildFiles, downloadZip, sha256 };
})();
