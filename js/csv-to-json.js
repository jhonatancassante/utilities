// js/csv-to-json-tarsu.js

const fileLabel = document.getElementById('file-label');
const jsonOutput = document.getElementById('jsonOutput');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const btnGroup = document.getElementById('btnGroup');
const errorMessage = document.getElementById('errorMessage');
const configPanel = document.getElementById('configPanel');
const encodingSelect = document.getElementById('encodingSelect');
const delimiterSelect = document.getElementById('delimiterSelect');
const headerLineList = document.getElementById('headerLineList');
const columnsGrid = document.getElementById('columnsGrid');
const selectAllColsBtn = document.getElementById('selectAllColsBtn');
const selectNoneColsBtn = document.getElementById('selectNoneColsBtn');

const DEFAULT_LABEL = 'Clique ou arraste o arquivo CSV aqui';
const DEFAULT_PRE_TEXT = 'O resultado aparecerá aqui após o envio do arquivo...';
const MAX_PREVIEW_LINES = 15;
const MAX_LINE_PREVIEW_CHARS = 140;

let currentFile = null;
let rawLines = [];
let headerLineIndex = 0;
let parsedData = [];
let parsedFields = [];
let generatedJsonString = '';

// Inicializa a seção de upload usando a função compartilhada
setupUploadSection('drop-zone', 'csvFile', function (files) {
    const file = files[0];
    handleFile(file);
});

function handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
        errorMessage.textContent = 'Erro: Por favor, selecione apenas arquivos .csv';
        return;
    }

    currentFile = file;
    fileLabel.textContent = file.name;
    errorMessage.textContent = '';
    headerLineIndex = 0;

    loadFileWithEncoding();
}

function loadFileWithEncoding() {
    if (!currentFile) return;

    jsonOutput.textContent = 'Processando arquivo...';
    copyBtn.style.display = 'none';
    if (btnGroup) btnGroup.style.display = 'none';
    generatedJsonString = '';

    const reader = new FileReader();

    reader.onload = function (evt) {
        const text = evt.target.result;
        rawLines = text.split(/\r?\n/);

        // Remove linhas totalmente vazias no final do arquivo
        while (rawLines.length && rawLines[rawLines.length - 1].trim() === '') {
            rawLines.pop();
        }

        if (rawLines.length === 0) {
            errorMessage.textContent = 'Erro: o arquivo está vazio.';
            configPanel.style.display = 'none';
            return;
        }

        if (headerLineIndex >= rawLines.length) {
            headerLineIndex = 0;
        }

        configPanel.style.display = 'flex';
        renderHeaderLineOptions();
        parseWithCurrentSettings();
    };

    reader.onerror = function () {
        errorMessage.textContent = 'Erro ao ler o arquivo. Tente novamente.';
    };

    reader.readAsText(currentFile, encodingSelect.value);
}

function truncateLine(line) {
    if (line.length <= MAX_LINE_PREVIEW_CHARS) return line;
    return line.slice(0, MAX_LINE_PREVIEW_CHARS) + '…';
}

function renderHeaderLineOptions() {
    const total = Math.min(rawLines.length, MAX_PREVIEW_LINES);
    let html = '';

    for (let i = 0; i < total; i++) {
        const isSelected = i === headerLineIndex;
        const lineText = truncateLine(rawLines[i]) || '(linha em branco)';
        html += `
			<label class="header-line-item${isSelected ? ' selected' : ''}" data-line-index="${i}">
				<input type="radio" name="headerLineRadio" value="${i}" ${isSelected ? 'checked' : ''} />
				<span class="line-number">${i + 1}</span>
				<span class="line-text">${escapeHtml(lineText)}</span>
			</label>
		`;
    }

    headerLineList.innerHTML = html;

    headerLineList.querySelectorAll('input[type="radio"]').forEach((radio) => {
        radio.addEventListener('change', function () {
            headerLineIndex = parseInt(this.value, 10);
            headerLineList.querySelectorAll('.header-line-item').forEach((item) => {
                item.classList.toggle(
                    'selected',
                    parseInt(item.dataset.lineIndex, 10) === headerLineIndex
                );
            });
            parseWithCurrentSettings();
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getDelimiterValue() {
    const value = delimiterSelect.value;
    if (value === 'auto') return '';
    if (value === '\\t') return '\t';
    return value;
}

function parseWithCurrentSettings() {
    const csvSlice = rawLines.slice(headerLineIndex).join('\n');

    Papa.parse(csvSlice, {
        header: true,
        skipEmptyLines: true,
        delimiter: getDelimiterValue(),
        complete: function (results) {
            if (results.errors && results.errors.length) {
                const fatalError = results.errors.find((e) => e.type !== 'FieldMismatch');
                if (fatalError) {
                    errorMessage.textContent = 'Erro ao interpretar o CSV: ' + fatalError.message;
                }
            }

            const fields = (results.meta && results.meta.fields) || [];

            if (fields.length === 0 || (fields.length === 1 && !fields[0])) {
                errorMessage.textContent =
                    'Não foi possível identificar colunas nesta linha. Escolha outra linha de cabeçalho.';
                parsedData = [];
                parsedFields = [];
                columnsGrid.innerHTML = '';
                updateJsonOutput();
                return;
            }

            errorMessage.textContent = '';
            parsedData = results.data;
            parsedFields = fields;
            renderColumnCheckboxes(parsedFields);
            updateJsonOutput();
        },
        error: function (err) {
            errorMessage.textContent = 'Erro na leitura do conteúdo: ' + err.message;
        }
    });
}

function renderColumnCheckboxes(fields) {
    let html = '';

    fields.forEach((field, index) => {
        const safeId = `col-${index}`;
        const label = field && field.trim() ? field : `(coluna ${index + 1})`;
        html += `
			<div class="column-item">
				<input type="checkbox" id="${safeId}" data-field="${escapeHtml(field)}" checked />
				<label for="${safeId}">${escapeHtml(label)}</label>
			</div>
		`;
    });

    columnsGrid.innerHTML = html;

    columnsGrid.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', updateJsonOutput);
    });
}

function getSelectedFields() {
    return Array.from(columnsGrid.querySelectorAll('input[type="checkbox"]:checked')).map(
        (cb) => cb.dataset.field
    );
}

function updateJsonOutput() {
    const selectedFields = getSelectedFields();

    if (!parsedData.length || !selectedFields.length) {
        generatedJsonString = '';
        jsonOutput.textContent = !parsedData.length
            ? DEFAULT_PRE_TEXT
            : 'Selecione ao menos uma coluna para gerar o JSON.';
        copyBtn.style.display = 'none';
        if (btnGroup) btnGroup.style.display = 'none';
        return;
    }

    const mappedData = parsedData.map((row) => {
        const obj = {};
        selectedFields.forEach((field) => {
            const value = row[field];
            obj[field] = typeof value === 'string' ? value.trim() : value ?? '';
        });
        return obj;
    });

    generatedJsonString = JSON.stringify(mappedData, null, 4);
    jsonOutput.textContent = generatedJsonString;

    if (btnGroup) btnGroup.style.display = 'flex';
    copyBtn.style.display = 'inline-flex';
}

function clearFiles() {
    currentFile = null;
    rawLines = [];
    headerLineIndex = 0;
    parsedData = [];
    parsedFields = [];
    generatedJsonString = '';

    fileLabel.textContent = DEFAULT_LABEL;
    jsonOutput.textContent = DEFAULT_PRE_TEXT;
    errorMessage.textContent = '';
    copyBtn.style.display = 'none';
    if (btnGroup) btnGroup.style.display = 'none';
    configPanel.style.display = 'none';
    headerLineList.innerHTML = '';
    columnsGrid.innerHTML = '';

    const csvInput = document.getElementById('csvFile');
    if (csvInput) csvInput.value = '';
}

// Reage a mudanças de codificação (precisa reler o arquivo) e delimitador (só reprocessa)
encodingSelect.addEventListener('change', loadFileWithEncoding);
delimiterSelect.addEventListener('change', parseWithCurrentSettings);

selectAllColsBtn.addEventListener('click', function () {
    columnsGrid
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = true));
    updateJsonOutput();
});

selectNoneColsBtn.addEventListener('click', function () {
    columnsGrid
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = false));
    updateJsonOutput();
});

// Baixar o arquivo .json
downloadBtn.addEventListener('click', function () {
    if (!generatedJsonString) return;

    const blob = new Blob([generatedJsonString], {
        type: 'application/json;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_convertidos.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Ação de copiar conteúdo
copyBtn.addEventListener('click', function () {
    if (!generatedJsonString) return;

    navigator.clipboard
        .writeText(generatedJsonString)
        .then(function () {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';

            setTimeout(function () {
                copyBtn.classList.remove('copied');
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            }, 2000);
        })
        .catch(function (err) {
            alert('Não foi possível copiar o texto automaticamente: ' + err);
        });
});
