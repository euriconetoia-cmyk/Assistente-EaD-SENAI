'use strict';

(() => {
  const MAT = globalThis.MAT;
  const U = MAT.utils;

  const headerIndex = (headers, patterns) => headers.findIndex((value) => patterns.some((pattern) => U.normalizeText(value).includes(pattern)));

  const cellLabel = (cell) => U.cleanText(
    cell?.textContent
    || cell?.getAttribute?.('aria-label')
    || cell?.getAttribute?.('title')
    || ''
  );

  const profileName = (profileLink, fallbackCell) => {
    const source = profileLink || fallbackCell;
    if (!source) return '';
    const copy = source.cloneNode(true);
    copy.querySelectorAll('.userinitials, [class*="userinitial"], [data-user-initials], img, picture, svg').forEach((node) => node.remove());
    return U.cleanStudentName(copy.textContent || source.getAttribute?.('aria-label') || source.textContent || '');
  };

  const tableHeaders = (table) => {
    let cells = [...table.querySelectorAll('thead th, thead td')];
    if (!cells.length) cells = [...table.querySelectorAll('tr:first-child th')];
    return cells.map(cellLabel);
  };

  const findBestTable = (doc, requiredGroups) => {
    const tables = [...doc.querySelectorAll('table')];
    return tables
      .map((table) => ({ table, headers: tableHeaders(table) }))
      .map((item) => {
        const headerScore = requiredGroups.reduce((score, group) => score + (headerIndex(item.headers, group) >= 0 ? 1 : 0), 0);
        const profileRows = item.table.querySelectorAll('tbody a[href*="/user/view.php"], tbody a[href*="/user/profile.php"]').length;
        const gradingClass = /grading|submission|assign|generaltable/i.test(item.table.className || '') ? 0.5 : 0;
        return { ...item, score: headerScore + (profileRows ? 0.75 : 0) + gradingClass };
      })
      .sort((a, b) => b.score - a.score)[0] || null;
  };

  const extractLabeledNumber = (doc, labels) => {
    const normalizedLabels = labels.map((label) => U.normalizeText(label));
    const nodes = [
      ...doc.querySelectorAll('table tr, .submissionstatustable tr, .grading-summary tr, [data-region="grading-summary"] tr, dl > div, .card-body, .generalbox')
    ];
    for (const node of nodes) {
      if (node.querySelector('a[href*="/user/view.php"], a[href*="/user/profile.php"]')) continue;
      const text = U.cleanText(node.textContent || '');
      const normalized = U.normalizeText(text);
      const label = normalizedLabels.find((candidate) => normalized.includes(candidate));
      if (!label) continue;
      const cells = [...node.querySelectorAll(':scope > th, :scope > td, :scope > dt, :scope > dd')];
      if (cells.length >= 2) {
        const labelIndex = cells.findIndex((cell) => normalizedLabels.some((candidate) => U.normalizeText(cell.textContent).includes(candidate)));
        if (labelIndex >= 0) {
          for (const cell of cells.slice(labelIndex + 1)) {
            const value = U.parseNumber(cell.textContent);
            if (value !== null) return { value, text, label, source: 'estrutura rotulada' };
          }
        }
      }
      const labelPosition = normalized.indexOf(label);
      const neighborhood = normalized.slice(Math.max(0, labelPosition - 30), labelPosition + label.length + 50);
      const after = neighborhood.slice(neighborhood.indexOf(label) + label.length).match(/\b(\d+)\b/);
      if (after) return { value: Number(after[1]), text, label, source: 'texto próximo ao rótulo' };
      const before = neighborhood.slice(0, neighborhood.indexOf(label)).match(/(\d+)\s*$/);
      if (before) return { value: Number(before[1]), text, label, source: 'texto antes do rótulo' };
    }
    return { value: null, text: '', label: '', source: '' };
  };


  const decimalFromToken = (value) => {
    const raw = U.cleanText(value);
    if (!raw) return null;
    const normalized = U.normalizeText(raw);
    if (/^(?:-|—|–|n\/?a)$/i.test(raw) || /sem nota|nenhuma nota|nao avaliado|not graded|no grade|ungraded|nao se aplica|not applicable/.test(normalized)) return null;
    const match = raw.match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0].replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed === -1) return null;
    return parsed;
  };

  const gradeCellValue = (cell) => {
    if (!cell) return { value: null, display: '', raw: '' };
    const input = cell.querySelector('input, select');
    const selected = input?.tagName === 'SELECT' ? input.selectedOptions?.[0]?.textContent || '' : '';
    const preferred = input?.value ?? selected ?? '';
    const visible = U.cleanText(
      cell.querySelector('.gradevalue, [data-region="grade-value"], .grade')?.textContent
      || selected
      || cell.getAttribute('data-value')
      || cell.getAttribute('data-grade')
      || cell.textContent
      || ''
    );
    const raw = U.cleanText(preferred !== '' && preferred !== null && preferred !== undefined ? preferred : visible);
    const value = decimalFromToken(raw || visible);
    return { value, display: visible || raw, raw };
  };

  const buildHeaderPaths = (table) => {
    const headerRows = [...table.querySelectorAll('thead tr')];
    if (!headerRows.length) return [];
    const grid = [];
    headerRows.forEach((tr, rowIndex) => {
      grid[rowIndex] = grid[rowIndex] || [];
      let column = 0;
      [...tr.children].forEach((cell) => {
        while (grid[rowIndex][column] !== undefined) column += 1;
        const text = cellLabel(cell);
        const rowspan = Math.max(1, Number(cell.getAttribute('rowspan')) || 1);
        const colspan = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
        for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
          grid[rowIndex + rowOffset] = grid[rowIndex + rowOffset] || [];
          for (let colOffset = 0; colOffset < colspan; colOffset += 1) {
            grid[rowIndex + rowOffset][column + colOffset] = text;
          }
        }
        column += colspan;
      });
    });
    const maxColumns = Math.max(...grid.map((row) => row.length), 0);
    return Array.from({ length: maxColumns }, (_, column) => {
      const parts = [];
      grid.forEach((row) => {
        const text = U.cleanText(row[column] || '');
        if (text && !parts.includes(text)) parts.push(text);
      });
      return parts.join(' › ');
    });
  };

  const gradeItemName = (label, index) => {
    const generic = /^(notas?|grades?|itens? de nota|grade items?|avaliacoes?|avaliações?|editar|controles?|selecionar|select)$/;
    const parts = String(label || '').split('›').map((part) => U.cleanText(part)).filter(Boolean);
    const filtered = parts.filter((part) => !generic.test(U.normalizeText(part)));
    return filtered.join(' › ') || `Item de nota ${index + 1}`;
  };

  const maxGradeFromText = (value) => {
    const normalized = U.normalizeText(value || '');
    const explicit = normalized.match(/(?:maximo|maxima|maximum|out of|de)\s*[:]?\s*(\d+(?:[.,]\d+)?)/);
    if (explicit) return Number(explicit[1].replace(',', '.'));
    const range = normalized.match(/(-?\d+(?:[.,]\d+)?)\s*(?:-|–|—|a|to)\s*(-?\d+(?:[.,]\d+)?)/);
    if (range) return Number(range[2].replace(',', '.'));
    return null;
  };

  class BaseAdapter {
    constructor() {
      this.environment = 'Moodle';
      this.host = location.hostname;
      this.courseId = U.parseCourseId(document);
    }

    detectCourse(doc = document) {
      const id = U.parseCourseId(doc) || this.courseId;
      const selectors = [
        '.page-header-headings h1',
        '.page-context-header h1',
        '#page-header h1',
        'header h1',
        'h1'
      ];
      let name = '';
      for (const selector of selectors) {
        const node = doc.querySelector(selector);
        if (node && U.cleanText(node.textContent)) {
          name = U.cleanText(node.textContent);
          break;
        }
      }
      if (!name) name = U.cleanText(document.title.replace(/\|.*$/, ''));
      return {
        id,
        name: name || `Curso ${id || 'não identificado'}`,
        url: id ? `${location.origin}/course/view.php?id=${id}` : location.href,
        environment: this.environment,
        host: this.host
      };
    }

    courseUrl(courseId) {
      return `${location.origin}/course/view.php?id=${courseId}`;
    }

    participantsUrl(courseId, limit = 500) {
      return `${location.origin}/user/index.php?id=${courseId}&perpage=${Math.max(10, Math.min(Number(limit) || 500, 1000))}`;
    }

    gradesUrl(courseId, limit = 500) {
      return `${location.origin}/grade/report/grader/index.php?id=${courseId}&perpage=${Math.max(10, Math.min(Number(limit) || 500, 1000))}`;
    }

    assignmentUrl(cmid) {
      return `${location.origin}/mod/assign/view.php?id=${cmid}`;
    }

    assignmentGradingUrl(cmid, limit = 500) {
      return `${location.origin}/mod/assign/view.php?id=${cmid}&action=grading&perpage=${Math.max(10, Math.min(Number(limit) || 500, 1000))}`;
    }

    extractSections(doc) {
      const selectors = [
        'li.section',
        '.course-section',
        '[data-for="section"]',
        '#region-main .topics > li'
      ];
      let sections = [];
      for (const selector of selectors) {
        const nodes = [...doc.querySelectorAll(selector)];
        if (nodes.length) {
          sections = nodes.map((node, index) => {
            const titleNode = node.querySelector('.sectionname, .section-title, h3, h4, [data-for="section_title"]');
            const titleLink = titleNode?.querySelector('a[href]') || node.querySelector('a[href*="section="]');
            const title = U.cleanText(titleNode?.textContent || `Seção ${index + 1}`);
            const text = U.cleanText(node.textContent);
            const metaClone = node.cloneNode(true);
            metaClone.querySelectorAll('li.activity, .activity-item, [data-activityname], .contentwithoutlink, .activity-information').forEach((item) => item.remove());
            const metaText = U.cleanText(metaClone.textContent || title);
            const dateRange = U.parseDateRange(metaText || title);
            const dates = dateRange.dates || [];
            const currentMarker = Boolean(
              node.matches('.current, [aria-current="true"], [data-iscurrent="1"], [data-current="1"]')
              || node.classList.contains('current')
              || node.querySelector('.badge-current, .current-section, [data-region="current-section"], [aria-label*="atual" i], [title*="atual" i]')
            );
            const availabilityText = U.normalizeText(node.querySelector('.availabilityinfo, [data-region="availability-info"]')?.textContent || '');
            const hidden = Boolean(
              node.hidden
              || node.getAttribute('aria-hidden') === 'true'
              || node.classList.contains('hidden')
              || node.classList.contains('dimmed')
              || /nao disponivel|não disponível|indisponivel|indisponível|not available|oculto|hidden/.test(availabilityText)
            );
            const activities = U.uniqueBy(
              [...node.querySelectorAll('li.activity, .activity-item, [data-activityname]')].map((activityNode, activityIndex) => {
                const link = activityNode.querySelector('a[href*="/mod/"][href*="/view.php"], a[href*="/mod/"]');
                const url = link ? U.absoluteUrl(link.href) : '';
                const urlMatch = url.match(/\/mod\/([^/]+)\//i);
                const classMatch = [...activityNode.classList].map((value) => value.match(/^modtype_(.+)$/i)).find(Boolean);
                const moduleType = (urlMatch?.[1] || classMatch?.[1] || activityNode.dataset?.modname || 'outro').toLowerCase();
                const cmid = link ? U.getQueryNumber(link.href, 'id') : null;
                const name = U.cleanText(
                  activityNode.dataset?.activityname
                  || link?.querySelector('.instancename')?.textContent
                  || link?.textContent
                  || `Atividade ${activityIndex + 1}`
                ).replace(/\s*(Tarefa|Questionário|Fórum|Arquivo|Pasta|Página|URL)\s*$/i, '');
                const typeLabels = {
                  assign: 'Tarefa', quiz: 'Questionário', forum: 'Fórum', scorm: 'SCORM',
                  resource: 'Arquivo', folder: 'Pasta', page: 'Página', url: 'URL', lesson: 'Lição', h5pactivity: 'H5P'
                };
                return {
                  id: cmid ? `cmid:${cmid}` : url || `${node.id || index}:${activityIndex}`,
                  cmid,
                  name: name || `Atividade ${activityIndex + 1}`,
                  moduleType,
                  typeLabel: typeLabels[moduleType] || moduleType,
                  url,
                  isAssignment: moduleType === 'assign'
                };
              }).filter((activity) => activity.name),
              (activity) => activity.id
            );
            const id = node.id || node.dataset?.sectionid || node.dataset?.id || `section_${index + 1}`;
            const sectionIndex = Number(node.dataset?.sectionnum || node.dataset?.number || index) || index;
            return {
              id,
              index: sectionIndex,
              sectionNumber: sectionIndex,
              title,
              name: title,
              text: text.slice(0, 500),
              metaText: metaText.slice(0, 700),
              dates,
              dateRange,
              startDate: dateRange.start || null,
              endDate: dateRange.end || null,
              currentMarker,
              hidden,
              url: titleLink ? U.absoluteUrl(titleLink.href) : `${(location.origin && location.origin !== 'null') ? location.origin : new URL(doc.baseURI || document.baseURI).origin}/course/view.php?id=${this.courseId || U.parseCourseId(doc) || ''}#${encodeURIComponent(id)}`,
              activityCount: activities.length,
              assignmentCount: activities.filter((activity) => activity.isAssignment).length,
              activities
            };
          });
          break;
        }
      }
      return sections.filter((item) => item.name && !/^geral$/i.test(item.name));
    }

    discoverAssignments(doc) {
      const links = [...doc.querySelectorAll('a[href*="/mod/assign/view.php"]')]
        .map((link) => {
          const cmid = U.getQueryNumber(link.href, 'id');
          const activityContainer = link.closest('li.activity, .activity-item, [data-activityname], .modtype_assign');
          const sectionContainer = link.closest('li.section, .course-section, [data-for="section"], #region-main .topics > li');
          const sectionTitleNode = sectionContainer?.querySelector('.sectionname, .section-title, h3, h4, [data-for="section_title"]');
          const sectionId = sectionContainer?.id || sectionContainer?.dataset?.sectionid || '';
          const sectionName = U.cleanText(sectionTitleNode?.textContent || '');
          const name = U.cleanText(
            link.querySelector('.instancename')?.textContent
            || activityContainer?.dataset?.activityname
            || link.textContent
          ).replace(/\s*Tarefa\s*$/i, '');
          const containerText = U.cleanText(activityContainer?.textContent || '');
          const date = U.parseDate(containerText);
          return {
            cmid,
            name: name || `Atividade ${cmid || ''}`,
            url: U.absoluteUrl(link.href),
            sectionId,
            sectionName,
            coursePageText: containerText.slice(0, 500),
            dueDate: date ? date.toISOString() : null,
            dueText: date ? U.formatDate(date, true) : ''
          };
        })
        .filter((item) => item.cmid);
      return U.uniqueBy(links, (item) => item.cmid);
    }

    extractParticipantRows(doc) {
      const required = [
        ['nome completo', 'nome', 'fullname', 'first name', 'sobrenome'],
        ['ultimo acesso', 'last access', 'ultimo acesso ao curso']
      ];
      const best = findBestTable(doc, required);
      if (!best || best.score < 1) return { rows: [], headers: [], diagnostics: { reason: 'Tabela de participantes não encontrada' } };

      const headers = best.headers;
      const nameIndex = headerIndex(headers, ['nome completo', 'nome', 'fullname', 'first name', 'sobrenome']);
      const emailIndex = headerIndex(headers, ['email', 'endereco de email', 'e-mail']);
      const roleIndex = headerIndex(headers, ['papeis', 'papel', 'roles', 'role']);
      const lastAccessIndex = headerIndex(headers, ['ultimo acesso ao curso', 'ultimo acesso', 'last access']);
      const statusIndex = headerIndex(headers, ['status', 'situacao']);

      const rows = [...best.table.querySelectorAll('tbody tr')].map((tr) => {
        const cells = [...tr.querySelectorAll('th, td')];
        const profileLink = tr.querySelector('a[href*="/user/view.php"], a[href*="/user/profile.php"]');
        const fallbackNameCell = nameIndex >= 0 ? cells[nameIndex] : cells.find((cell) => cell.querySelector('a[href*="/user/"]'));
        const name = profileName(profileLink, fallbackNameCell);
        if (!name) return null;
        const userId = profileLink ? U.getQueryNumber(profileLink.href, 'id') : null;
        const lastAccessText = lastAccessIndex >= 0 ? U.cleanText(cells[lastAccessIndex]?.textContent) : '';
        return {
          id: userId,
          key: userId ? `id:${userId}` : `name:${U.normalizeText(name)}`,
          name,
          email: emailIndex >= 0 ? U.cleanText(cells[emailIndex]?.textContent) : '',
          role: roleIndex >= 0 ? U.cleanText(cells[roleIndex]?.textContent) : '',
          status: statusIndex >= 0 ? U.cleanText(cells[statusIndex]?.textContent) : '',
          lastAccessText,
          lastAccessDays: U.parseRelativeDays(lastAccessText),
          profileUrl: profileLink ? U.absoluteUrl(profileLink.href) : '',
          source: 'Página de participantes'
        };
      }).filter(Boolean);

      return {
        rows: U.uniqueBy(rows, (item) => item.key),
        headers,
        diagnostics: { tableCount: doc.querySelectorAll('table').length, matchedHeaders: headers }
      };
    }

    extractAssignmentSummary(doc, seed) {
      const pageText = U.cleanText(doc.body?.textContent || '');
      const title = U.cleanText(
        doc.querySelector('.page-header-headings h1, .page-context-header h1, #page-header h1, h1')?.textContent
        || seed.name
      );

      const values = {};
      [...doc.querySelectorAll('table tr, .submissionstatustable tr, .gradingtable tr, dl > div')].forEach((row) => {
        const cells = [...row.querySelectorAll(':scope > th, :scope > td, :scope > dt, :scope > dd')];
        if (cells.length < 2) return;
        const key = U.normalizeText(cells[0].textContent);
        const value = U.cleanText(cells.slice(1).map((cell) => cell.textContent).join(' '));
        if (key) values[key] = value;
      });

      const findValue = (...keys) => {
        const entry = Object.entries(values).find(([key]) => keys.some((candidate) => key.includes(candidate)));
        return entry?.[1] || '';
      };

      const dueText = findValue('data de entrega', 'data limite', 'due date', 'vencimento')
        || U.cleanText(doc.querySelector('.activity-dates, [data-region="activity-dates"]')?.textContent || '')
        || seed.dueText;
      const dueDate = U.parseDate(dueText) || (seed.dueDate ? new Date(seed.dueDate) : null);

      const needsResult = extractLabeledNumber(doc, [
        'precisa de avaliação', 'precisam de avaliação', 'necessita de avaliação', 'necessitam de avaliação',
        'entregas para avaliar', 'a avaliar', 'needs grading', 'requires grading'
      ]);
      const submittedResult = extractLabeledNumber(doc, [
        'entregas enviadas', 'submissões', 'submissoes', 'submissions'
      ]);
      const participantsResult = extractLabeledNumber(doc, ['participantes', 'participants', 'alunos']);

      const needsFromValue = U.parseNumber(findValue('necessita de avaliacao', 'precisa de avaliacao', 'needs grading', 'para avaliar'));
      const submittedFromValue = U.parseNumber(findValue('entregas enviadas', 'submissoes', 'submissions'));
      const participantsFromValue = U.parseNumber(findValue('participantes', 'participants'));
      const gradeButton = doc.querySelector('a[href*="action=grading"], a[href*="action=grader"], a[href*="action=viewpluginpage"], [data-region="grading-navigation"] a[href]');

      const needsGrading = needsFromValue !== null ? needsFromValue : needsResult.value;
      const submitted = submittedFromValue !== null
        ? submittedFromValue
        : submittedResult.source === 'estrutura rotulada'
          ? submittedResult.value
          : null;
      const participants = participantsFromValue !== null ? participantsFromValue : participantsResult.value;

      return {
        ...seed,
        name: title || seed.name,
        dueDate: dueDate ? dueDate.toISOString() : null,
        dueText: dueText || seed.dueText || '',
        daysUntilDue: dueDate ? U.daysUntil(dueDate) : null,
        needsGrading,
        submitted,
        participants,
        summaryCounts: {
          needsGrading,
          submitted,
          participants,
          needsSource: needsFromValue !== null ? 'tabela de resumo' : needsResult.source,
          submittedSource: submittedFromValue !== null
            ? 'tabela de resumo'
            : submittedResult.source === 'estrutura rotulada'
              ? submittedResult.source
              : '',
          participantsSource: participantsFromValue !== null ? 'tabela de resumo' : participantsResult.source
        },
        gradingUrl: gradeButton ? U.absoluteUrl(gradeButton.href) : this.assignmentGradingUrl(seed.cmid),
        summaryText: pageText.slice(0, 1500),
        source: seed.url
      };
    }

    extractGradingPageSummary(doc) {
      const needsResult = extractLabeledNumber(doc, [
        'precisa de avaliação', 'precisam de avaliação', 'necessita de avaliação', 'necessitam de avaliação',
        'entregas para avaliar', 'a avaliar', 'needs grading', 'requires grading'
      ]);
      const submittedResult = extractLabeledNumber(doc, [
        'entregas enviadas', 'submissões', 'submissoes', 'submissions'
      ]);
      const participantsResult = extractLabeledNumber(doc, ['participantes', 'participants', 'alunos']);
      const groupSelector = doc.querySelector('select[name="group"], select[data-action="change-group"], .groupselector select');
      const selectedGroup = groupSelector?.selectedOptions?.[0]?.textContent || '';
      return {
        needsGrading: needsResult.value,
        submitted: submittedResult.source === 'estrutura rotulada' ? submittedResult.value : null,
        participants: participantsResult.value,
        needsSource: needsResult.source,
        submittedSource: submittedResult.source === 'estrutura rotulada' ? submittedResult.source : '',
        participantsSource: participantsResult.source,
        selectedGroup: U.cleanText(selectedGroup),
        hasGroupFilter: Boolean(groupSelector),
        pageHasGradingControls: Boolean(doc.querySelector('[data-region="grading-navigation"], .gradingtable, #region-main table, form[action*="grading"]'))
      };
    }

    extractAssignmentGradingRows(doc, assignment) {
      const required = [
        ['nome completo', 'nome', 'fullname', 'first name', 'sobrenome', 'aluno', 'participante'],
        ['status', 'situacao', 'situação', 'submission'],
        ['nota', 'grade', 'avaliacao', 'avaliação']
      ];
      const best = findBestTable(doc, required);
      if (!best || best.score < 1.25) {
        return { rows: [], headers: [], diagnostics: { reason: 'Tabela de avaliação não encontrada com confiança suficiente', bestScore: best?.score || 0, bestHeaders: best?.headers || [] } };
      }
      const headers = best.headers;
      const nameIndex = headerIndex(headers, ['nome completo', 'nome', 'fullname', 'first name', 'sobrenome', 'aluno', 'participante']);
      const emailIndex = headerIndex(headers, ['email', 'e-mail']);
      const statusIndex = headerIndex(headers, ['status de envio', 'status', 'situacao', 'submission status', 'submission']);
      const gradingStatusIndex = headerIndex(headers, ['status da avaliacao', 'status de avaliacao', 'grading status']);
      let gradeIndex = headerIndex(headers, ['nota', 'grade']);
      if (gradeIndex < 0) gradeIndex = headers.findIndex((header) => {
        const normalized = U.normalizeText(header);
        return normalized.includes('avaliacao') && !normalized.includes('status');
      });
      const modifiedIndex = headerIndex(headers, ['ultima modificacao', 'last modified', 'modificado', 'data de envio']);
      const fileIndex = headerIndex(headers, ['arquivo', 'file submissions', 'envios de arquivo', 'ficheiro']);
      const feedbackIndex = headerIndex(headers, ['feedback', 'comentarios de feedback', 'comentários de feedback']);

      const rows = [...best.table.querySelectorAll('tbody tr')].map((tr) => {
        const cells = [...tr.querySelectorAll(':scope > th, :scope > td')];
        const profileLink = tr.querySelector('a[href*="/user/view.php"], a[href*="/user/profile.php"]');
        const nameCell = nameIndex >= 0 ? cells[nameIndex] : cells.find((cell) => cell.querySelector('a[href*="/user/"]'));
        const name = profileName(profileLink, nameCell);
        if (!name) return null;
        const userId = profileLink ? U.getQueryNumber(profileLink.href, 'id') : null;
        const statusText = statusIndex >= 0 ? cellLabel(cells[statusIndex]) : U.cleanText(tr.textContent);
        const gradingStatusText = gradingStatusIndex >= 0 ? cellLabel(cells[gradingStatusIndex]) : '';
        const combinedStatus = U.cleanText(`${statusText} ${gradingStatusText} ${tr.getAttribute('data-status') || ''}`);
        const normalizedStatus = U.normalizeText(combinedStatus);

        const gradeCell = gradeIndex >= 0 ? cells[gradeIndex] : tr.querySelector('td[class*="grade"], [data-region="grade"]');
        const gradeInput = gradeCell?.querySelector('input[type="text"], input[type="number"], select');
        const selectedText = gradeInput?.tagName === 'SELECT' ? gradeInput.selectedOptions?.[0]?.textContent : '';
        const gradeRaw = gradeInput?.value ?? selectedText ?? gradeCell?.textContent ?? '';
        const gradeText = U.cleanText(selectedText || gradeInput?.value || gradeCell?.textContent || '');
        const grade = U.parseGrade(gradeRaw || gradeText);

        const fileLinks = fileIndex >= 0
          ? [...cells[fileIndex]?.querySelectorAll('a[href]') || []].map((a) => ({ name: U.cleanText(a.textContent), url: U.absoluteUrl(a.href) }))
          : [...tr.querySelectorAll('a[href*="pluginfile.php"], a[href*="forcedownload"]')].map((a) => ({ name: U.cleanText(a.textContent), url: U.absoluteUrl(a.href) }));
        const submissionLink = tr.querySelector('a[href*="action=grader"], a[href*="action=grading"], a[href*="userid="]');
        const modifiedText = modifiedIndex >= 0 ? cellLabel(cells[modifiedIndex]) : '';

        const explicitMissing = /nenhuma entrega|nenhuma tentativa|nenhum envio|sem entrega|sem envio|nao enviado|não enviado|no submission|no submissions|not submitted|no attempt/.test(normalizedStatus);
        const explicitSubmitted = /enviado para avaliacao|enviado para avaliação|enviado para correcao|entregue para avaliacao|submetido|submitted for grading|submitted|entregue|envio realizado|finalizado/.test(normalizedStatus);
        const draftOnly = /rascunho|draft/.test(normalizedStatus) && !explicitSubmitted;
        const explicitNeedsGrading = /precisa de avaliacao|necessita de avaliacao|aguardando avaliacao|aguardando correcao|pendente de avaliacao|pendente de correcao|a avaliar|nao avaliado|ungraded|needs grading|requires grading|not graded/.test(normalizedStatus);
        const explicitGraded = !explicitNeedsGrading && /avaliado|corrigido|avaliacao concluida|nota atribuida|graded|feedback fornecido|feedback provided/.test(normalizedStatus);
        const hasModification = Boolean(modifiedText && !/^-|nunca|never|nao ha|não há/.test(U.normalizeText(modifiedText)));
        const submitted = !explicitMissing && !draftOnly && (explicitSubmitted || fileLinks.length > 0 || hasModification || Boolean(submissionLink && /submitted|submission|entrega|envio/i.test(submissionLink.href + ' ' + submissionLink.textContent)));
        const feedbackText = feedbackIndex >= 0 ? cellLabel(cells[feedbackIndex]) : '';
        const normalizedFeedback = U.normalizeText(feedbackText);
        const feedbackPresent = Boolean(normalizedFeedback && !/^(?:-|nenhum(?: comentario| feedback)?|sem feedback|no feedback|none|not available)$/.test(normalizedFeedback));
        // A comment recorded in Moodle is evidence that the tutor completed a correction.
        // Uma nota padrão (inclusive 0) não comprova correção quando o próprio
        // Moodle identifica a linha como sem envio.
        const graded = !explicitMissing && (grade !== null || explicitGraded || feedbackPresent);
        const missing = explicitMissing;
        const unknown = !submitted && !graded && !missing;

        return {
          studentId: userId,
          studentKey: userId ? `id:${userId}` : `name:${U.normalizeText(name)}`,
          name,
          studentName: name,
          email: emailIndex >= 0 ? cellLabel(cells[emailIndex]) : '',
          profileUrl: profileLink ? U.absoluteUrl(profileLink.href) : '',
          statusText: combinedStatus,
          submitted,
          missing,
          unknown,
          graded,
          requiresGrading: !feedbackPresent && (explicitNeedsGrading || (submitted && !graded)),
          grade,
          gradeDisplay: gradeText,
          gradeText,
          feedbackText,
          feedbackPresent,
          modifiedText,
          files: fileLinks,
          filePresent: fileLinks.length > 0,
          assignmentId: assignment.cmid,
          assignmentName: assignment.name,
          assignmentUrl: assignment.url,
          gradingUrl: assignment.gradingUrl
        };
      }).filter(Boolean);

      return {
        rows: U.uniqueBy(rows, (item) => item.studentKey),
        headers,
        diagnostics: {
          matchedHeaders: headers,
          rowCount: rows.length,
          tableScore: best.score,
          indexes: { nameIndex, statusIndex, gradingStatusIndex, gradeIndex, modifiedIndex, fileIndex }
        }
      };
    }

    extractGradebookReport(doc, course = {}) {
      const tables = [...doc.querySelectorAll('table')];
      const candidates = tables.map((table) => {
        const profileRows = table.querySelectorAll('tbody a[href*="/user/view.php"], tbody a[href*="/user/profile.php"]').length;
        const userDataRows = table.querySelectorAll('tbody tr[data-userid], tbody [data-userid]').length;
        const gradeCells = table.querySelectorAll('tbody td.grade, tbody td[class*="grade"], tbody td[data-itemid], tbody input[name*="grade"], tbody select[name*="grade"]').length;
        const headers = buildHeaderPaths(table);
        const headerText = U.normalizeText(headers.join(' '));
        const classBonus = /gradestable|grade-report-grader|grader/i.test(table.className || '') ? 4 : 0;
        const headerBonus = /nota|grade|total/.test(headerText) ? 2 : 0;
        return { table, headers, score: profileRows * 3 + userDataRows + Math.min(gradeCells, 20) / 4 + classBonus + headerBonus };
      }).sort((a, b) => b.score - a.score);
      const best = candidates[0];
      if (!best || best.score < 3) {
        return {
          items: [], students: [], summary: { itemCount: 0, studentCount: 0 },
          meta: { status: 'nao_reconhecido', partial: true },
          diagnostics: { reason: 'Livro de notas não encontrado com confiança suficiente', candidates: candidates.slice(0, 3).map((item) => ({ score: item.score, headers: item.headers })) }
        };
      }

      const table = best.table;
      const headers = best.headers;
      const bodyRows = [...table.querySelectorAll('tbody tr')];
      const userRows = bodyRows.filter((tr) => {
        const profile = tr.querySelector('a[href*="/user/view.php"], a[href*="/user/profile.php"]');
        const userId = tr.getAttribute('data-userid') || tr.querySelector('[data-userid]')?.getAttribute('data-userid');
        const userCell = tr.querySelector('th.user, th[scope="row"], td.user, [data-region="user"]');
        return Boolean(profile || userId && userCell);
      });
      if (!userRows.length) {
        return {
          items: [], students: [], summary: { itemCount: 0, studentCount: 0 },
          meta: { status: 'sem_alunos', partial: true },
          diagnostics: { reason: 'A tabela foi localizada, mas nenhuma linha de aluno foi reconhecida', score: best.score, headers }
        };
      }

      const firstCells = [...userRows[0].querySelectorAll(':scope > th, :scope > td')];
      const rangeRow = bodyRows.find((tr) => tr.matches('.range, [data-region="range"]') || /faixa|intervalo|range/i.test(tr.className || ''));
      const rangeCells = rangeRow ? [...rangeRow.querySelectorAll(':scope > th, :scope > td')] : [];
      const headerByClass = new Map();
      [...table.querySelectorAll('thead th, thead td')].forEach((cell) => {
        const classColumn = [...cell.classList].map((name) => name.match(/^c(\d+)$/)).find(Boolean)?.[1];
        if (classColumn !== undefined) headerByClass.set(Number(classColumn), cell);
      });

      const excludedHeader = /nome|name|usuario|usuário|participante|aluno|email|e-mail|perfil|profile|selecionar|select|status|acao|ação|feedback|comentario|comentário/;
      const items = [];
      firstCells.forEach((cell, columnIndex) => {
        const normalizedHeader = U.normalizeText(headers[columnIndex] || '');
        const classColumn = [...cell.classList].map((name) => name.match(/^c(\d+)$/)).find(Boolean)?.[1];
        const headerCell = classColumn !== undefined ? headerByClass.get(Number(classColumn)) : null;
        const itemId = cell.getAttribute('data-itemid')
          || cell.querySelector('[data-itemid]')?.getAttribute('data-itemid')
          || headerCell?.getAttribute('data-itemid')
          || '';
        const gradeLike = Boolean(
          itemId
          || cell.matches('td.grade, td[class*="grade"], [data-region="grade"]')
          || cell.querySelector('input, select')
          || /nota|grade|total|avaliacao|avaliação/.test(normalizedHeader)
        );
        if (!gradeLike || excludedHeader.test(normalizedHeader) && !itemId && !/total/.test(normalizedHeader)) return;
        const label = gradeItemName(headers[columnIndex] || headerCell?.textContent || cell.getAttribute('aria-label') || '', columnIndex);
        const normalizedLabel = U.normalizeText(label);
        const rangeText = U.cleanText(rangeCells[columnIndex]?.textContent || headerCell?.getAttribute('title') || headers[columnIndex] || '');
        const maxGrade = maxGradeFromText(rangeText);
        const isCourseTotal = /total do curso|total geral do curso|course total|overall course total|nota final do curso/.test(normalizedLabel);
        const isTotal = isCourseTotal || /\btotal\b/.test(normalizedLabel);
        const type = isCourseTotal ? 'course_total' : String(headers[columnIndex] || '') !== label ? 'activity' : isTotal ? 'category' : 'unknown';
        items.push({
          key: itemId ? `item:${itemId}` : `column:${columnIndex}`,
          id: itemId || `column:${columnIndex}`,
          itemId: itemId || null,
          name: label,
          path: headers[columnIndex] || label,
          type,
          columnIndex,
          maxGrade,
          isCourseTotal,
          isTotal,
          category: label.includes('›') ? label.split('›').slice(0, -1).join('›').trim() : '',
          sourceHeader: headers[columnIndex] || ''
        });
      });

      const uniqueItems = U.uniqueBy(items, (item) => item.key);
      const courseTotalItem = uniqueItems.find((item) => item.isCourseTotal) || null;
      const emailColumn = headers.findIndex((header) => /email|e-mail/.test(U.normalizeText(header)));
      const students = userRows.map((tr) => {
        const cells = [...tr.querySelectorAll(':scope > th, :scope > td')];
        const profileLink = tr.querySelector('a[href*="/user/view.php"], a[href*="/user/profile.php"]');
        const userCell = tr.querySelector('th.user, th[scope="row"], td.user, [data-region="user"]');
        const studentName = profileName(profileLink, userCell);
        if (!studentName) return null;
        const studentId = profileLink ? U.getQueryNumber(profileLink.href, 'id') : Number(tr.getAttribute('data-userid') || tr.querySelector('[data-userid]')?.getAttribute('data-userid')) || null;
        const grades = {};
        uniqueItems.forEach((item) => {
          let gradeCell = cells[item.columnIndex];
          if (item.itemId) {
            gradeCell = cells.find((candidate) => String(candidate.getAttribute('data-itemid') || candidate.querySelector('[data-itemid]')?.getAttribute('data-itemid') || '') === String(item.itemId)) || gradeCell;
          }
          const parsed = gradeCellValue(gradeCell);
          grades[item.key] = {
            value: parsed.value,
            display: parsed.display,
            raw: parsed.raw,
            status: parsed.value === null ? 'sem_nota' : 'com_nota'
          };
        });
        const totalEntry = courseTotalItem ? grades[courseTotalItem.key] : null;
        const values = uniqueItems.map((item) => grades[item.key]?.value).filter((value) => value !== null);
        return {
          studentId,
          studentKey: studentId ? `id:${studentId}` : `name:${U.normalizeText(studentName)}`,
          studentName,
          email: emailColumn >= 0 ? cellLabel(cells[emailColumn]) : '',
          profileUrl: profileLink ? U.absoluteUrl(profileLink.href) : '',
          grades,
          courseTotal: totalEntry?.value ?? null,
          courseTotalDisplay: totalEntry?.display || '',
          gradedItems: values.length,
          missingItems: Math.max(0, uniqueItems.length - values.length)
        };
      }).filter(Boolean);

      const pagingLinks = [...doc.querySelectorAll('.paging a[href], [data-region="paging"] a[href], nav[aria-label*="pag" i] a[href]')];
      const paginationDetected = pagingLinks.some((link) => /(?:page|pageindex|offset|start)=/i.test(link.href));
      const groupSelector = doc.querySelector('select[name="group"], select[data-action="change-group"], .groupselector select');
      const selectedGroup = U.cleanText(groupSelector?.selectedOptions?.[0]?.textContent || '');
      const limitedByGroup = Boolean(groupSelector && selectedGroup && !/todos|all participants|nenhum grupo|no group/.test(U.normalizeText(selectedGroup)));
      const collapsedCategoryControls = [...doc.querySelectorAll('thead [aria-expanded="false"], thead .collapsed, thead a[title], thead button[title], thead a[aria-label], thead button[aria-label]')]
        .filter((element) => /expandir|mostrar itens|mostrar categoria|show items|expand|uncollapse/.test(U.normalizeText(`${element.getAttribute('title') || ''} ${element.getAttribute('aria-label') || ''} ${element.textContent || ''}`)));
      const collapsedCategoriesDetected = collapsedCategoryControls.length > 0;
      const totalGradeCells = students.length * uniqueItems.length;
      const gradedCells = students.reduce((sum, student) => sum + student.gradedItems, 0);
      const studentsWithCourseTotal = students.filter((student) => student.courseTotal !== null).length;
      const partial = paginationDetected || limitedByGroup || collapsedCategoriesDetected;

      return {
        course: { id: course.id || this.courseId, name: course.name || '', url: course.url || this.courseUrl(course.id || this.courseId), environment: course.environment || this.environment || '' },
        items: uniqueItems,
        students: U.uniqueBy(students, (student) => student.studentKey),
        courseTotalItem,
        summary: {
          itemCount: uniqueItems.length,
          studentCount: students.length,
          gradedCells,
          missingCells: Math.max(0, totalGradeCells - gradedCells),
          studentsWithCourseTotal,
          studentsWithoutCourseTotal: Math.max(0, students.length - studentsWithCourseTotal)
        },
        meta: {
          status: uniqueItems.length ? 'ok' : 'sem_itens',
          collectedAt: new Date().toISOString(),
          partial,
          paginationDetected,
          limitedByGroup,
          selectedGroup,
          collapsedCategoriesDetected,
          collapsedCategoryCount: collapsedCategoryControls.length,
          confidence: partial ? 'media' : uniqueItems.length && students.length ? 'alta' : 'baixa'
        },
        diagnostics: {
          tableScore: best.score,
          headers,
          rowCount: students.length,
          itemCount: uniqueItems.length,
          paginationDetected,
          limitedByGroup,
          selectedGroup,
          collapsedCategoriesDetected,
          collapsedCategoryCount: collapsedCategoryControls.length
        }
      };
    }

    extractGradeRows(doc, course = {}) {
      const gradebook = this.extractGradebookReport(doc, course);
      const rows = gradebook.students.map((student) => ({
        studentId: student.studentId,
        studentKey: student.studentKey,
        studentName: student.studentName,
        email: student.email,
        total: student.courseTotal,
        totalDisplay: student.courseTotalDisplay,
        confidence: gradebook.courseTotalItem ? gradebook.meta.confidence : 'não disponível',
        source: gradebook.courseTotalItem ? 'Total do curso no livro de notas' : 'Total do curso não identificado'
      }));
      return {
        rows,
        gradebook,
        diagnostics: {
          ...gradebook.diagnostics,
          courseTotalItem: gradebook.courseTotalItem?.name || null,
          courseTotalRecognized: Boolean(gradebook.courseTotalItem)
        }
      };
    }
  }

  class FiegAdapter extends BaseAdapter {
    constructor() {
      super();
      this.environment = 'Moodle Goiás';
    }
  }

  class CtmAdapter extends BaseAdapter {
    constructor() {
      super();
      this.environment = 'Moodle CTM GO';
    }
  }

  const createAdapter = () => {
    if (location.hostname === 'ead.fieg.com.br') return new FiegAdapter();
    if (location.hostname === 'ead.senai.br') return new CtmAdapter();
    return new BaseAdapter();
  };

  MAT.adapters = { BaseAdapter, FiegAdapter, CtmAdapter, createAdapter };
})();
