// js/csv-to-json-tarsu.js

const fileLabel = document.getElementById('file-label');
const jsonOutput = document.getElementById('jsonOutput');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const btnGroup = document.getElementById('btnGroup');
const errorMessage = document.getElementById('errorMessage');

const DEFAULT_LABEL = 'Clique ou arraste o arquivo TARSU CSV aqui';
const DEFAULT_PRE_TEXT = 'O resultado filtrado aparecerá aqui após o envio do arquivo...';

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

    fileLabel.textContent = file.name;
    errorMessage.textContent = '';
    jsonOutput.textContent = 'Processando arquivo...';
    copyBtn.style.display = 'none';

    const reader = new FileReader();

    reader.onload = function (evt) {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);

        let dataStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('CPF / CNPJ') && lines[i].includes('CCM')) {
                dataStartIndex = i;
                break;
            }
        }

        if (dataStartIndex === -1) {
            errorMessage.textContent =
                'Erro: Não foi possível localizar a linha de cabeçalho dos dados no CSV.';
            jsonOutput.textContent = 'Erro no mapeamento.';
            if (btnGroup) btnGroup.style.display = 'none';
            return;
        }

        const csvDataOnly = lines.slice(dataStartIndex).join('\n');

        Papa.parse(csvDataOnly, {
            header: true,
            skipEmptyLines: true,
            delimiter: ';',
            complete: function (results) {
                try {
                    processData(results.data);
                } catch (err) {
                    errorMessage.textContent = 'Erro ao filtrar os dados: ' + err.message;
                    jsonOutput.textContent = 'Erro no processamento.';
                    if (btnGroup) btnGroup.style.display = 'none';
                    copyBtn.style.display = 'none';
                }
            },
            error: function (err) {
                errorMessage.textContent = 'Erro na leitura do conteúdo: ' + err.message;
            }
        });
    };

    reader.readAsText(file, 'ISO-8859-1');
}

function processData(rawData) {
    const mappedData = rawData
        .filter((item) => item['CCM'])
        .map((item) => {
            return {
                ccm: item['CCM'] ? item['CCM'].trim() : '',
                quantidade: item['Quant (Kg)'] ? item['Quant (Kg)'].trim() : '',
                valor: item['Valor (R$)'] ? item['Valor (R$)'].trim() : ''
            };
        });

    generatedJsonString = JSON.stringify(mappedData, null, 4);
    jsonOutput.textContent = generatedJsonString;

    // Exibe botões de ação
    if (btnGroup) btnGroup.style.display = 'flex';
    copyBtn.style.display = 'inline-flex';
}

function clearFiles() {
    generatedJsonString = '';
    fileLabel.textContent = DEFAULT_LABEL;
    jsonOutput.textContent = DEFAULT_PRE_TEXT;
    errorMessage.textContent = '';
    copyBtn.style.display = 'none';
    if (btnGroup) btnGroup.style.display = 'none';

    const csvInput = document.getElementById('csvFile');
    if (csvInput) csvInput.value = '';
}

// Baixar o arquivo .json
downloadBtn.addEventListener('click', function () {
    if (!generatedJsonString) return;

    const blob = new Blob([generatedJsonString], {
        type: 'application/json;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarsu_filtrado.json';
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
            alert('Não foi possível copiar o texto automaticamente: ', err);
        });
});
