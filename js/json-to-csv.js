// js/json-to-csv.js

const fileLabel = document.getElementById('file-label');
const csvOutput = document.getElementById('csvOutput');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const btnGroup = document.getElementById('btnGroup');
const errorMessage = document.getElementById('errorMessage');
const configPanel = document.getElementById('configPanel');
const delimiterSelect = document.getElementById('delimiterSelect');
const encodingSelect = document.getElementById('encodingSelect');
const columnsGrid = document.getElementById('columnsGrid');
const selectAllColsBtn = document.getElementById('selectAllColsBtn');
const selectNoneColsBtn = document.getElementById('selectNoneColsBtn');

const DEFAULT_LABEL = 'Clique ou arraste o arquivo JSON aqui';
const DEFAULT_PRE_TEXT = 'O resultado aparecerá aqui após o envio do arquivo...';

let parsedRows = [];
let orderedFields = [];
let generatedCsvString = '';

// Inicializa a seção de upload usando a função compartilhada
setupUploadSection('drop-zone', 'jsonFile', function (files) {
    const file = files[0];
    handleFile(file);
});

function handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.json')) {
        errorMessage.textContent = 'Erro: Por favor, selecione apenas arquivos .json';
        return;
    }

    fileLabel.textContent = file.name;
    errorMessage.textContent = '';
    csvOutput.textContent = 'Processando arquivo...';
    copyBtn.style.display = 'none';
    if (btnGroup) btnGroup.style.display = 'none';
    configPanel.style.display = 'none';
    generatedCsvString = '';

    const reader = new FileReader();

    reader.onload = function (evt) {
        let text = evt.target.result;

        // Remove um possível BOM no início do arquivo
        if (text.charCodeAt(0) === 0xfeff) {
            text = text.slice(1);
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            errorMessage.textContent = 'Erro: o arquivo não contém um JSON válido (' + err.message + ')';
            csvOutput.textContent = DEFAULT_PRE_TEXT;
            return;
        }

        const rows = normalizeToRows(parsed);

        if (!rows || rows.length === 0) {
            errorMessage.textContent = 'Erro: não foi possível encontrar dados tabuláveis neste JSON.';
            csvOutput.textContent = DEFAULT_PRE_TEXT;
            return;
        }

        parsedRows = rows;
        orderedFields = collectOrderedFields(rows);

        configPanel.style.display = 'flex';
        renderColumnCheckboxes(orderedFields);
        updateCsvOutput();
    };

    reader.onerror = function () {
        errorMessage.textContent = 'Erro ao ler o arquivo. Tente novamente.';
    };

    reader.readAsText(file, 'UTF-8');
}

/**
 * Normaliza o JSON recebido para uma lista de objetos (linhas da futura tabela).
 * - Array de objetos: usado diretamente.
 * - Array de valores simples: cada valor vira { value: ... }.
 * - Objeto contendo uma única propriedade que é array: usa essa propriedade.
 * - Objeto simples: tratado como uma única linha.
 */
function normalizeToRows(parsed) {
    if (Array.isArray(parsed)) {
        return parsed.map((item) =>
            item && typeof item === 'object' && !Array.isArray(item) ? item : { value: item }
        );
    }

    if (parsed && typeof parsed === 'object') {
        const arrayProps = Object.keys(parsed).filter((key) => Array.isArray(parsed[key]));

        if (arrayProps.length === 1) {
            return normalizeToRows(parsed[arrayProps[0]]);
        }

        return [parsed];
    }

    return null;
}

function collectOrderedFields(rows) {
    const fields = [];
    const seen = new Set();

    rows.forEach((row) => {
        Object.keys(row).forEach((key) => {
            if (!seen.has(key)) {
                seen.add(key);
                fields.push(key);
            }
        });
    });

    return fields;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderColumnCheckboxes(fields) {
    let html = '';

    fields.forEach((field, index) => {
        const safeId = `col-${index}`;
        html += `
			<div class="column-item">
				<input type="checkbox" id="${safeId}" data-field="${escapeHtml(field)}" checked />
				<label for="${safeId}">${escapeHtml(field)}</label>
			</div>
		`;
    });

    columnsGrid.innerHTML = html;

    columnsGrid.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        checkbox.addEventListener('change', updateCsvOutput);
    });
}

function getSelectedFields() {
    return Array.from(columnsGrid.querySelectorAll('input[type="checkbox"]:checked')).map(
        (cb) => cb.dataset.field
    );
}

function getDelimiterValue() {
    const value = delimiterSelect.value;
    return value === '\\t' ? '\t' : value;
}

/** Converte um valor de célula em texto: objetos e listas viram JSON em string. */
function cellToText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function updateCsvOutput() {
    const selectedFields = getSelectedFields();

    if (!parsedRows.length || !selectedFields.length) {
        generatedCsvString = '';
        csvOutput.textContent = !parsedRows.length
            ? DEFAULT_PRE_TEXT
            : 'Selecione ao menos uma coluna para gerar o CSV.';
        copyBtn.style.display = 'none';
        if (btnGroup) btnGroup.style.display = 'none';
        return;
    }

    const rowsAsText = parsedRows.map((row) => {
        const obj = {};
        selectedFields.forEach((field) => {
            obj[field] = cellToText(row[field]);
        });
        return obj;
    });

    generatedCsvString = Papa.unparse(rowsAsText, {
        delimiter: getDelimiterValue(),
        columns: selectedFields,
        header: true
    });

    csvOutput.textContent = generatedCsvString;

    if (btnGroup) btnGroup.style.display = 'flex';
    copyBtn.style.display = 'inline-flex';
}

/** Converte uma string JS em bytes ISO-8859-1 (Latin1), substituindo caracteres fora da faixa por '?'. */
function stringToLatin1Bytes(str) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        bytes[i] = code <= 0xff ? code : 0x3f; // '?'
    }
    return bytes;
}

function clearFiles() {
    parsedRows = [];
    orderedFields = [];
    generatedCsvString = '';

    fileLabel.textContent = DEFAULT_LABEL;
    csvOutput.textContent = DEFAULT_PRE_TEXT;
    errorMessage.textContent = '';
    copyBtn.style.display = 'none';
    if (btnGroup) btnGroup.style.display = 'none';
    configPanel.style.display = 'none';
    columnsGrid.innerHTML = '';

    const jsonInput = document.getElementById('jsonFile');
    if (jsonInput) jsonInput.value = '';
}

delimiterSelect.addEventListener('change', updateCsvOutput);

selectAllColsBtn.addEventListener('click', function () {
    columnsGrid
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = true));
    updateCsvOutput();
});

selectNoneColsBtn.addEventListener('click', function () {
    columnsGrid
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = false));
    updateCsvOutput();
});

// Baixar o arquivo .csv, respeitando a codificação escolhida
downloadBtn.addEventListener('click', function () {
    if (!generatedCsvString) return;

    const encoding = encodingSelect.value;
    let blob;

    if (encoding === 'latin1') {
        blob = new Blob([stringToLatin1Bytes(generatedCsvString)], {
            type: 'text/csv;charset=iso-8859-1;'
        });
    } else {
        const text = encoding === 'utf8-bom' ? '\ufeff' + generatedCsvString : generatedCsvString;
        blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_convertidos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Ação de copiar conteúdo (sempre em texto UTF-8 puro, sem BOM)
copyBtn.addEventListener('click', function () {
    if (!generatedCsvString) return;

    navigator.clipboard
        .writeText(generatedCsvString)
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
