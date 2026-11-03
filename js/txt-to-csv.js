/**
 * De TXT para CSV
 * Converte relatórios em TXT com colunas de largura fixa em CSV.
 *
 * Regras de leitura:
 *  - A 1ª linha pode ser apenas um título (ex.: "REFISNO Relatório") ou já ser
 *    o cabeçalho. Se for título, o cabeçalho vem na 2ª linha.
 *  - As colunas são descobertas pelo cabeçalho: cada nome começa onde há um
 *    texto precedido por 2 ou mais espaços (ou no início da linha).
 *  - Cada linha de dados é "fatiada" nas mesmas posições do cabeçalho.
 */
(function (root) {
    'use strict';

    // Dois ou mais espaços entre textos = separação entre colunas do cabeçalho
    const COLUMN_GAP = /\S {2,}\S/;

    /* ------------------------------------------------------------------ */
    /* Núcleo (sem DOM, testável em Node)                                  */
    /* ------------------------------------------------------------------ */

    function decodeBuffer(buffer) {
        const bytes = new Uint8Array(buffer);
        try {
            return {
                text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
                encoding: 'UTF-8',
            };
        } catch (e) {
            return {
                text: new TextDecoder('windows-1252').decode(bytes),
                encoding: 'Windows-1252',
            };
        }
    }

    function findColumnStarts(headerLine) {
        const starts = [];
        for (let i = 0; i < headerLine.length; i++) {
            const ch = headerLine[i];
            if (ch === ' ') continue;
            const atStart = i === 0 || headerLine[i - 1] === ' ';
            const afterGap =
                i === 0 ||
                (headerLine[i - 1] === ' ' &&
                    (i === 1 || headerLine[i - 2] === ' '));
            if (atStart && afterGap) starts.push(i);
        }
        // A primeira coluna sempre começa no início da linha
        if (starts.length) starts[0] = 0;
        return starts;
    }

    function parseFixedWidth(text) {
        const lines = text.split(/\r\n|\n|\r/);
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

        let first = 0;
        while (first < lines.length && !lines[first].trim()) first++;
        if (first >= lines.length) {
            throw new Error('O arquivo está vazio.');
        }

        // Cabeçalho = 1ª ou 2ª linha com mais de uma coluna
        let headerIdx = -1;
        for (let i = first; i < Math.min(first + 2, lines.length); i++) {
            if (COLUMN_GAP.test(lines[i].trimEnd())) {
                headerIdx = i;
                break;
            }
        }
        if (headerIdx === -1) {
            throw new Error(
                'Não encontrei a linha de colunas na 1ª nem na 2ª linha do arquivo.',
            );
        }

        const title = headerIdx > first ? lines[first].trim() : null;
        const headerLine = lines[headerIdx];
        const starts = findColumnStarts(headerLine);
        if (starts.length < 2) {
            throw new Error('Não consegui identificar as colunas do cabeçalho.');
        }

        const headers = starts.map((start, k) =>
            headerLine
                .slice(start, k + 1 < starts.length ? starts[k + 1] : undefined)
                .trim(),
        );

        const rows = [];
        let misaligned = 0;
        for (let i = headerIdx + 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            let bad = false;
            const row = starts.map((start, k) => {
                if (k > 0 && start <= line.length && line[start - 1] !== ' ') {
                    bad = true;
                }
                return line
                    .slice(start, k + 1 < starts.length ? starts[k + 1] : undefined)
                    .trim();
            });
            if (bad) misaligned++;
            rows.push(row);
        }

        return {
            title,
            headers,
            rows,
            headerLineNumber: headerIdx + 1,
            misaligned,
        };
    }

    function formatValue(value, opts) {
        let v = value;
        if (opts.dateOnly) {
            // 26/10/2026 00:00:00 -> 26/10/2026
            v = v.replace(
                /^(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}(?::\d{2})?$/,
                '$1',
            );
        }
        if (opts.decimalDot) {
            v = v.replace(/^(-?\d+),(\d+)$/, '$1.$2');
        }
        return v;
    }

    function escapeCell(value, separator) {
        if (
            value.includes(separator) ||
            value.includes('"') ||
            /[\r\n]/.test(value)
        ) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
    }

    function toCsv(headers, rows, options) {
        const opts = Object.assign(
            { separator: ';', decimalDot: false, dateOnly: false },
            options,
        );
        const fmt = (v) => formatValue(v, opts);

        const out = [headers.map((h) => escapeCell(h, opts.separator))];
        rows.forEach((row) =>
            out.push(row.map((c) => escapeCell(fmt(c), opts.separator))),
        );
        return out.map((r) => r.join(opts.separator)).join('\r\n') + '\r\n';
    }

    const api = { decodeBuffer, parseFixedWidth, formatValue, toCsv };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    /* ------------------------------------------------------------------ */
    /* Interface                                                           */
    /* ------------------------------------------------------------------ */

    function initUI() {
        const $ = (id) => document.getElementById(id);
        const dropzone = $('t2cDropzone');
        const fileInput = $('t2cFile');
        const separatorEl = $('t2cSeparator');
        const decimalEl = $('t2cDecimalDot');
        const dateOnlyEl = $('t2cDateOnly');
        const bomEl = $('t2cBom');
        const resultEl = $('t2cResult');
        const errorEl = $('t2cError');
        const statsEl = $('t2cStats');
        const warnEl = $('t2cWarning');
        const previewHead = $('t2cPreviewHead');
        const previewBody = $('t2cPreviewBody');
        const downloadBtn = $('t2cDownload');
        const resetBtn = $('t2cReset');
        const fileNameEl = $('t2cFileName');

        if (!dropzone || !fileInput) return;

        const state = { parsed: null, fileName: '', encoding: '' };
        const PREVIEW_ROWS = 15;

        function showError(message) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            if (resultEl) resultEl.style.display = 'none';
        }

        function currentCsv() {
            return toCsv(state.parsed.headers, state.parsed.rows, {
                separator: separatorEl.value === 'tab' ? '\t' : separatorEl.value,
                decimalDot: decimalEl.checked,
                dateOnly: dateOnlyEl.checked,
            });
        }

        function render() {
            if (!state.parsed) return;
            const { headers, rows, title, misaligned, headerLineNumber } =
                state.parsed;

            errorEl.style.display = 'none';
            resultEl.style.display = 'block';

            const parts = [
                rows.length + ' linhas de dados',
                headers.length + ' colunas',
                'codificação ' + state.encoding,
            ];
            if (title) parts.push('título ignorado: "' + title + '"');
            parts.push('cabeçalho na linha ' + headerLineNumber);
            statsEl.textContent = parts.join(' · ');

            if (misaligned > 0) {
                warnEl.textContent =
                    misaligned +
                    ' linha(s) têm texto cruzando o limite de uma coluna. ' +
                    'Confira a prévia: o arquivo pode não ser de largura fixa exata.';
                warnEl.style.display = 'block';
            } else {
                warnEl.style.display = 'none';
            }

            previewHead.replaceChildren();
            const headRow = document.createElement('tr');
            headers.forEach((h) => {
                const th = document.createElement('th');
                th.textContent = h;
                headRow.appendChild(th);
            });
            previewHead.appendChild(headRow);

            previewBody.replaceChildren();
            rows.slice(0, PREVIEW_ROWS).forEach((r) => {
                const tr = document.createElement('tr');
                r.forEach((c) => {
                    const td = document.createElement('td');
                    td.textContent = formatValue(c, {
                        dateOnly: dateOnlyEl.checked,
                        decimalDot: decimalEl.checked,
                    });
                    tr.appendChild(td);
                });
                previewBody.appendChild(tr);
            });
        }

        async function handleFile(file) {
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
                showError('Erro: Por favor, selecione apenas arquivos .txt');
                return;
            }

            try {
                const buffer = await file.arrayBuffer();
                const { text, encoding } = decodeBuffer(buffer);
                state.parsed = parseFixedWidth(text);
                state.fileName = file.name;
                state.encoding = encoding;
                fileNameEl.textContent = file.name;
                render();
            } catch (err) {
                state.parsed = null;
                showError(err.message || 'Não foi possível ler o arquivo.');
            }
        }

        function download() {
            if (!state.parsed) return;
            const csv = (bomEl.checked ? '\uFEFF' : '') + currentCsv();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download =
                (state.fileName.replace(/\.[^.]+$/, '') || 'relatorio') + '.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function reset() {
            state.parsed = null;
            fileInput.value = '';
            fileNameEl.textContent = 'Clique ou arraste o arquivo TXT aqui';
            resultEl.style.display = 'none';
            errorEl.style.display = 'none';
        }

        // Eventos de clique e seleção de arquivo
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFile(fileInput.files[0]);
            }
        });

        if (downloadBtn) downloadBtn.addEventListener('click', download);
        if (resetBtn) resetBtn.addEventListener('click', reset);

        [separatorEl, decimalEl, dateOnlyEl, bomEl].forEach((el) =>
            el.addEventListener('change', () => {
                if (state.parsed) render();
            }),
        );

        // Comportamento robusto de Drag and Drop direto na dropzone
        ['dragenter', 'dragover'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('is-dragging', 'dragover');
            });
        });

        ['dragleave', 'drop'].forEach((evt) => {
            dropzone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('is-dragging', 'dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                handleFile(files[0]);
            }
        });

        // Atualiza o texto dos labels "Sim/Não" dos switches dinamicamente
        document.querySelectorAll('.switch input[type="checkbox"]').forEach(input => {
            const stateSpan = document.getElementById(input.id + 'State');
            if (stateSpan) {
                const updateStateText = () => {
                    stateSpan.textContent = input.checked ? 'Sim' : 'Não';
                };
                updateStateText();
                input.addEventListener('change', updateStateText);
            }
        });
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
            initUI();
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
