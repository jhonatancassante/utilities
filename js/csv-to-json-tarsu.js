const fileInput = document.getElementById('csvFile');
const fileLabel = document.getElementById('file-label');
const jsonOutput = document.getElementById('jsonOutput');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const errorMessage = document.getElementById('errorMessage');
const dropZone = document.getElementById('drop-zone');

let generatedJsonString = "";

// Gerencia a carga e processamento do arquivo
function handleFile(file) {
    if (!file) return;

    fileLabel.textContent = file.name;
    errorMessage.textContent = "";
    jsonOutput.textContent = "Processando arquivo...";
    copyBtn.style.display = 'none';

    const reader = new FileReader();

    reader.onload = function (evt) {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);

        let dataStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("CPF / CNPJ") && lines[i].includes("CCM")) {
                dataStartIndex = i;
                break;
            }
        }

        if (dataStartIndex === -1) {
            errorMessage.textContent = "Erro: Não foi possível localizar a linha de cabeçalho dos dados (CPF / CNPJ;Nome;...) no CSV.";
            jsonOutput.textContent = "Erro no mapeamento.";
            return;
        }

        const csvDataOnly = lines.slice(dataStartIndex).join("\n");

        Papa.parse(csvDataOnly, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            complete: function (results) {
                try {
                    processData(results.data);
                } catch (err) {
                    errorMessage.textContent = "Erro ao filtrar os dados: " + err.message;
                    jsonOutput.textContent = "Erro no processamento.";
                    downloadBtn.style.display = 'none';
                    copyBtn.style.display = 'none';
                }
            },
            error: function (err) {
                errorMessage.textContent = "Erro na leitura do conteúdo: " + err.message;
            }
        });
    };

    reader.readAsText(file, 'ISO-8859-1');
}

// Ouvinte do Input de Arquivo tradicional
fileInput.addEventListener('change', function (e) {
    handleFile(e.target.files[0]);
});

// Suporte a Drag and Drop (Arrastar e Soltar)
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFile(e.dataTransfer.files[0]);
    }
});

// Acessibilidade por Teclado (Enter ou Espaço na div simulada)
dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});

function processData(rawData) {
    const mappedData = rawData
        .filter(item => item["CCM"])
        .map(item => {
            return {
                ccm: item["CCM"] ? item["CCM"].trim() : "",
                quantidade: item["Quant (Kg)"] ? item["Quant (Kg)"].trim() : "",
                valor: item["Valor (R$)"] ? item["Valor (R$)"].trim() : ""
            };
        });

    generatedJsonString = JSON.stringify(mappedData, null, 4);
    jsonOutput.textContent = generatedJsonString;

    downloadBtn.style.display = 'inline-block';
    copyBtn.style.display = 'inline-flex';
}

downloadBtn.addEventListener('click', function () {
    if (!generatedJsonString) return;

    const blob = new Blob([generatedJsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarsu_filtrado.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

copyBtn.addEventListener('click', function () {
    if (!generatedJsonString) return;

    navigator.clipboard.writeText(generatedJsonString).then(function () {
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';

        setTimeout(function () {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
    }).catch(function (err) {
        alert('Não foi possível copiar o texto automaticamente: ', err);
    });
});
