const fileInput = document.getElementById('csvFile');
const fileLabel = document.getElementById('file-label');
const jsonOutput = document.getElementById('jsonOutput');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const errorMessage = document.getElementById('errorMessage');
const dropZone = document.getElementById('drop-zone');

function handleFile(file) {
    if (!file || !file.name.endsWith('.csv')) {
        errorMessage.textContent = "Erro: Por favor, selecione apenas arquivos .csv";
        return;
    }

    fileLabel.textContent = file.name;
    errorMessage.textContent = "";
    jsonOutput.textContent = "Processando arquivo...";
    copyBtn.style.display = 'none';

    const reader = new FileReader();
    
    reader.onload = function(evt) {
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
            complete: function(results) {
                try {
                    processData(results.data);
                } catch (err) {
                    errorMessage.textContent = "Erro ao filtrar os dados: " + err.message;
                    jsonOutput.textContent = "Erro no processamento.";
                    downloadBtn.style.display = 'none';
                    copyBtn.style.display = 'none';
                }
            },
            error: function(err) {
                errorMessage.textContent = "Erro na leitura do conteúdo: " + err.message;
            }
        });
    };

    reader.readAsText(file, 'ISO-8859-1');
}

// --- Eventos de Drag and Drop ---

// Previne o comportamento padrão do navegador (que seria abrir o arquivo)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Adiciona classe visual quando o arquivo está sobre a zona
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

// Remove a classe visual quando o arquivo sai da zona ou é solto
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

// Captura o arquivo quando ele é solto
dropZone.addEventListener('drop', function(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
});

// Atualiza o evento 'change' do input tradicional para usar a nova função
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    handleFile(file);
});

let generatedJsonString = "";

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    fileLabel.textContent = file.name;
    errorMessage.textContent = "";
    jsonOutput.textContent = "Processando arquivo...";
    copyBtn.style.display = 'none'; // Oculta o botão se carregar um novo arquivo

    const reader = new FileReader();
    
    reader.onload = function(evt) {
        const text = evt.target.result;
        
        // Separa por linhas para encontrar onde começam os dados reais
        const lines = text.split(/\r?\n/);
        
        // Procuramos a linha que contém o cabeçalho real dos dados
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

        // Junta novamente apenas a partir da linha de cabeçalho correta
        const csvDataOnly = lines.slice(dataStartIndex).join("\n");

        // Executa o PapaParse apenas no bloco de dados úteis
        Papa.parse(csvDataOnly, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";", // Força o delimitador correto identificador no seu arquivo
            complete: function(results) {
                try {
                    processData(results.data);
                } catch (err) {
                    errorMessage.textContent = "Erro ao filtrar os dados: " + err.message;
                    jsonOutput.textContent = "Erro no processamento.";
                    downloadBtn.style.display = 'none';
                    copyBtn.style.display = 'none';
                }
            },
            error: function(err) {
                errorMessage.textContent = "Erro na leitura do conteúdo: " + err.message;
            }
        });
    };

    reader.readAsText(file, 'ISO-8859-1'); // Codificação comum para planilhas geradas em português (trata acentos)
});

function processData(rawData) {
    // Mapeia isolando estritamente os campos solicitados
    const mappedData = rawData
        .filter(item => item["CCM"]) // Garante que ignora linhas de totalizadores ou vazias no fim do bloco
        .map(item => {
            return {
                ccm: item["CCM"] ? item["CCM"].trim() : "",
                quantidade: item["Quant (Kg)"] ? item["Quant (Kg)"].trim() : "",
                valor: item["Valor (R$)"] ? item["Valor (R$)"].trim() : ""
            };
        });

    // Converte em String JSON estruturada
    generatedJsonString = JSON.stringify(mappedData, null, 4);
    
    // Exibe na tela do usuário
    jsonOutput.textContent = generatedJsonString;
    
    // Ativa botões de download e cópia
    downloadBtn.style.display = 'inline-block';
    copyBtn.style.display = 'inline-flex';
}

// Baixar o arquivo .json gerado automaticamente
downloadBtn.addEventListener('click', function() {
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

// Ação de copiar conteúdo para a Área de Transferência (Clipboard)
copyBtn.addEventListener('click', function() {
    if (!generatedJsonString) return;

    navigator.clipboard.writeText(generatedJsonString).then(function() {
        // Feedback visual de sucesso
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        
        // Restaura o botão original após 2 segundos
        setTimeout(function() {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
    }).catch(function(err) {
        alert('Não foi possível copiar o texto automaticamente: ', err);
    });
});
