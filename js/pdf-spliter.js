async function processPDFs() {
    const pdfInput = document.getElementById('pdfInput');
	const pageInit = Number(document.getElementById('pageInit').value);
    const pageCount = Number(document.getElementById('pageCount').value);
    const status = document.getElementById('status');

    if (pdfInput.files.length === 0) {
        status.textContent = "Selecione pelo menos um arquivo PDF!";
        return;
    }

    status.textContent = "Processando...";
    const zip = new JSZip();

    try {
        await Promise.all(Array.from(pdfInput.files).map(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

    const totalPages = pdfDoc.getPageCount();
    const startPage = Math.max(0, pageInit - 1); // Começa do 0
    const endPage = startPage + pageCount; // Não precisa -1 pois loop já exclui end

    // Validação
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


        // Gerar arquivo ZIP
        const zipBlob = await zip.generateAsync({type: 'blob'});
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(zipBlob);
        
        // Gerar timestamp no formato yyyymmddhhmmss (horário local)
        const now = new Date();
        const timestamp = 
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') + // Mês começa em 0 (0 = Janeiro)
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0')
        
        downloadLink.download = `${timestamp}.zip`;
        downloadLink.click();
        
        status.textContent = "Download iniciado!";
    } catch (error) {
        status.textContent = "Erro ao processar arquivos: " + error.message;
    }
}