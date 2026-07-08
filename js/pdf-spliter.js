document.addEventListener('DOMContentLoaded', () => {
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.addEventListener('click', processPDFs);
    }
});

async function processPDFs() {
    const pdfInput = document.getElementById('pdfInput');
    const statusDiv = document.getElementById('status');

    if (!pdfInput.files || pdfInput.files.length === 0) {
        statusDiv.textContent = "Por favor, selecione ao menos um arquivo PDF.";
        statusDiv.style.color = "#e74c3c";
        return;
    }

    statusDiv.style.color = "#2c3e50";
    statusDiv.textContent = "Processando arquivos...";

    try {
        // Sua lógica atual do pdf-lib & JSZip entra aqui de forma limpa.

        statusDiv.textContent = "Processamento concluído com sucesso!";
        statusDiv.style.color = "#2ecc71";
    } catch (error) {
        console.error(error);
        statusDiv.textContent = "Erro ao processar PDFs: " + error.message;
        statusDiv.style.color = "#e74c3c";
    }
}
