/**
 * Inicializa a gestão de tema (Light / Dark).
 * Lê a preferência salva no localStorage (padrão 'light') e configura os ouvintes no botão de alternância.
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

/**
 * Aplica o tema na página e atualiza o ícone do botão.
 * @param {string} theme - 'light' ou 'dark'
 */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
    }
}

// Executa após o carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});

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
