const fileLabel = document.getElementById('file-label');
const status = document.getElementById('status');
const btnGroup = document.getElementById('btnGroup');
let selectedFiles = [];

const DEFAULT_LABEL = 'Clique ou arraste seus arquivos PDF aqui (múltiplos arquivos)';

// Inicializa a área de drag & drop reutilizando o global.js
setupUploadSection('drop-zone', 'pdfInput', function (files) {
    const validFiles = Array.from(files).filter((file) =>
        file.name.toLowerCase().endsWith('.pdf')
    );

    if (validFiles.length === 0) {
        status.textContent = 'Erro: Por favor, selecione apenas arquivos .pdf';
        status.style.color = '#e74c3c';
        return;
    }

    // Acumula os novos arquivos sem duplicar
    validFiles.forEach((newFile) => {
        const isDuplicate = selectedFiles.some(
            (existingFile) => existingFile.name === newFile.name
        );
        if (!isDuplicate) {
            selectedFiles.push(newFile);
        }
    });

    status.textContent = '';
    updateUI();
});

// Atualiza a interface (oculta botões se houver menos de 2 arquivos)
function updateUI() {
    if (selectedFiles.length === 0) {
        fileLabel.textContent = DEFAULT_LABEL;
        if (btnGroup) btnGroup.style.display = 'none';
    } else {
        // O grupo de botões só fica visível se houver pelo menos 2 PDFs
        if (selectedFiles.length >= 2) {
            if (btnGroup) btnGroup.style.display = 'flex';
            status.textContent = '';
        } else {
            if (btnGroup) btnGroup.style.display = 'none';
            status.textContent = 'Aviso: Selecione pelo menos 2 arquivos PDF para unificar.';
            status.style.color = '#e67e22'; // Laranja de aviso
        }

        if (selectedFiles.length === 1) {
            fileLabel.textContent = selectedFiles[0].name;
        } else {
            fileLabel.textContent = `${selectedFiles.length} arquivos PDF selecionados`;
        }
    }
}

function clearFiles() {
    selectedFiles = [];
    const pdfInput = document.getElementById('pdfInput');
    if (pdfInput) pdfInput.value = '';
    status.textContent = '';
    updateUI();
}

async function mergePDFs() {
    if (selectedFiles.length < 2) {
        status.textContent = 'Selecione pelo menos dois arquivos PDF!';
        status.style.color = '#e74c3c';
        return;
    }

    status.textContent = 'Processando e unificando PDFs...';
    status.style.color = '#2c3e50';

    try {
        // 1. Ordenação alfabética natural
        const sortedFiles = [...selectedFiles].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: 'base'
            })
        );

        // 2. Criação do PDF consolidado final
        const mergedPdf = await PDFLib.PDFDocument.create();

        for (const file of sortedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();

            const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);

            copiedPages.forEach((page) => mergedPdf.addPage(page));

            // Paridade: se ímpar, adiciona página em branco
            if (pageCount % 2 !== 0) {
                const lastPage = copiedPages[copiedPages.length - 1];
                const { width, height } = lastPage.getSize();
                mergedPdf.addPage([width, height]);
            }
        }

        // 3. Salva e baixa usando a função global de data/hora
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const fileName = `${getFormattedTimestamp()}.pdf`;

        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = fileName;
        downloadLink.click();
        URL.revokeObjectURL(downloadLink.href);

        status.textContent = `PDF unificado gerado com sucesso: ${fileName}`;
        status.style.color = '#2ecc71';
    } catch (error) {
        status.textContent = 'Erro ao unificar arquivos: ' + error.message;
        status.style.color = '#e74c3c';
    }
}
