// js/pdf-merger.js

const fileLabel = document.getElementById('file-label');
const status = document.getElementById('status');
let selectedFiles = []; // Mantém o histórico acumulado dos PDFs selecionados

// Inicializa a área de drag & drop reutilizando o global.js
setupUploadSection('drop-zone', 'pdfInput', function (files) {
    const validFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.pdf'));

    if (validFiles.length === 0) {
        status.textContent = "Erro: Por favor, selecione apenas arquivos .pdf";
        status.style.color = "#e74c3c";
        return;
    }

    // Acumula os novos arquivos sem duplicar os existentes (baseado no nome do arquivo)
    validFiles.forEach(newFile => {
        const isDuplicate = selectedFiles.some(existingFile => existingFile.name === newFile.name);
        if (!isDuplicate) {
            selectedFiles.push(newFile);
        }
    });

    status.textContent = "";

    if (selectedFiles.length === 1) {
        fileLabel.textContent = selectedFiles[0].name;
    } else {
        fileLabel.textContent = `${selectedFiles.length} arquivos PDF selecionados`;
    }
});

async function mergePDFs() {
    if (selectedFiles.length === 0) {
        status.textContent = "Selecione pelo menos um arquivo PDF!";
        status.style.color = "#e74c3c";
        return;
    }

    status.textContent = "Processando e unificando PDFs...";
    status.style.color = "#2c3e50";

    try {
        // 1. Ordenação alfabética natural (ex: A, B, C, D)
        const sortedFiles = [...selectedFiles].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        // 2. Criação do PDF consolidado final
        const mergedPdf = await PDFLib.PDFDocument.create();

        for (const file of sortedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();

            // Copia todas as páginas do arquivo atual
            const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);

            copiedPages.forEach(page => mergedPdf.addPage(page));

            // 3. Verificação de paridade: se for ímpar, insere uma página em branco
            if (pageCount % 2 !== 0) {
                const lastPage = copiedPages[copiedPages.length - 1];
                const { width, height } = lastPage.getSize();
                mergedPdf.addPage([width, height]);
            }
        }

        // 4. Salva o documento consolidado
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

        // 5. Formatação do nome com data e hora invertida: AAAAMMDDHHmm
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        const fileName = `${year}${month}${day}${hours}${minutes}.pdf`;

        // 6. Download automático
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = fileName;
        downloadLink.click();
        URL.revokeObjectURL(downloadLink.href);

        status.textContent = `PDF unificado gerado com sucesso: ${fileName}`;
        status.style.color = "#2ecc71";
    } catch (error) {
        status.textContent = "Erro ao unificar arquivos: " + error.message;
        status.style.color = "#e74c3c";
    }
}
