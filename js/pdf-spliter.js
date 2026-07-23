// js/pdf-spliter.js

const fileLabel = document.getElementById('file-label');
const status = document.getElementById('status');
let selectedFiles = []; // Armazena os arquivos acumulados

// Inicializa o utilitário global passando os IDs e o callback
setupUploadSection('drop-zone', 'pdfInput', function (files) {
    const validFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.pdf'));

    if (validFiles.length === 0) {
        status.textContent = "Erro: Por favor, selecione apenas arquivos .pdf";
        status.style.color = "#e74c3c";
        return;
    }

    // Acumula os novos arquivos sem duplicar os existentes
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

async function processPDFs() {
    const pageInit = Number(document.getElementById('pageInit').value);
    const pageCount = Number(document.getElementById('pageCount').value);

    if (selectedFiles.length === 0) {
        status.textContent = "Selecione pelo menos um arquivo PDF!";
        status.style.color = "#e74c3c";
        return;
    }

    status.textContent = "Processando...";
    status.style.color = "#2c3e50";
    const zip = new JSZip();

    try {
        await Promise.all(selectedFiles.map(async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

            const totalPages = pdfDoc.getPageCount();
            const startPage = Math.max(0, pageInit - 1);
            const endPage = startPage + pageCount;

            if (startPage < 0 || endPage > totalPages) {
                throw new Error(`Intervalo inválido em "${file.name}": o documento tem apenas ${totalPages} página(s).`);
            }

            const pageIndices = [];
            for (let i = startPage; i < endPage; i++) {
                pageIndices.push(i);
            }

            const newPdf = await PDFLib.PDFDocument.create();
            const pages = await newPdf.copyPages(pdfDoc, pageIndices);
            pages.forEach(page => newPdf.addPage(page));

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });

            zip.file(`${pageCount}_pages_from_${pageInit}_${file.name}`, blob);
        }));

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);

        const now = new Date();
        const timestamp =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');

        downloadLink.download = `${timestamp}.zip`;
        downloadLink.click();

        status.textContent = "Download iniciado!";
        status.style.color = "#2ecc71"; // Verde de sucesso
    } catch (error) {
        status.textContent = "Erro ao processar arquivos: " + error.message;
        status.style.color = "#e74c3c";
    }
}
