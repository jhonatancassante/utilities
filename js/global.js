/**
 * Inicializa o comportamento de Drag and Drop e Clique em uma área de upload.
 * @param {string} dropZoneId - ID do elemento container (zona de drop)
 * @param {string} inputId - ID do elemento <input type="file">
 * @param {Function} onFilesSelected - Função executada passando a lista de arquivos selecionados
 */
function setupUploadSection(dropZoneId, inputId, onFilesSelected) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(inputId);

    if (!dropZone || !fileInput) return;

    // Garante que o clique na área de drop abra o seletor de arquivos
    dropZone.addEventListener('click', () => fileInput.click());

    // Previne comportamentos padrão do navegador
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(
            eventName,
            (e) => {
                e.preventDefault();
                e.stopPropagation();
            },
            false
        );
    });

    // Feedback visual ao arrastar o arquivo por cima
    ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener(
            eventName,
            () => dropZone.classList.add('dragover'),
            false
        );
    });

    // Remove feedback visual ao sair da área ou soltar
    ['dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(
            eventName,
            () => dropZone.classList.remove('dragover'),
            false
        );
    });

    // Captura os arquivos no evento de soltar (Drop)
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            onFilesSelected(files);
        }
    });

    // Captura os arquivos na seleção tradicional (Clique)
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            onFilesSelected(files);
        }
    });
}

/**
 * Gera uma string formatada no padrão AAAAMMDDHHmmSS para arquivos baixados.
 * @returns {string} Timestamp formatado ex: 20260730143000
 */
function getFormattedTimestamp() {
    const now = new Date();
    return (
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0')
    );
}
