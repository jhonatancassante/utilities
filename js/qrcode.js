document.addEventListener('DOMContentLoaded', function() {
    const urlInput = document.getElementById('url-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const qrcodeDiv = document.getElementById('qrcode');
    const qrContainer = document.getElementById('qr-container');
    const qrBorder = document.getElementById('qr-border');
    const qrFooter = document.getElementById('qr-footer');
    
    // Elementos de controle de cor
    const qrColorInput = document.getElementById('qr-color');
    const bgColorInput = document.getElementById('bg-color');
    const borderColorInput = document.getElementById('border-color');
    const textColorInput = document.getElementById('text-color');
    
    // Pré-visualizações de cor
    const qrColorPreview = document.getElementById('qr-color-preview');
    const bgColorPreview = document.getElementById('bg-color-preview');
    const borderColorPreview = document.getElementById('border-color-preview');
    const textColorPreview = document.getElementById('text-color-preview');
    
    let qrcode = null;

    // Atualiza as pré-visualizações de cor
    function updateColorPreviews() {
        qrColorPreview.style.backgroundColor = qrColorInput.value;
        bgColorPreview.style.backgroundColor = bgColorInput.value;
        borderColorPreview.style.backgroundColor = borderColorInput.value;
        textColorPreview.style.backgroundColor = textColorInput.value;
    }
    
    // Ouvintes para mudanças de cor
    qrColorInput.addEventListener('input', updateColorPreviews);
    bgColorInput.addEventListener('input', updateColorPreviews);
    borderColorInput.addEventListener('input', updateColorPreviews);
    textColorInput.addEventListener('input', updateColorPreviews);
    
    // Gerar QR Code
    generateBtn.addEventListener('click', function() {
        const url = urlInput.value.trim();
        
        if (!url) {
            alert('Por favor, digite um URL válido');
            return;
        }
        
        // Limpa o QR Code anterior
        qrcodeDiv.innerHTML = '';
        
        // Aplica as cores selecionadas
        qrBorder.style.borderColor = borderColorInput.value;
        qrFooter.style.backgroundColor = borderColorInput.value;
        qrFooter.style.color = textColorInput.value;
        
        // Cria novo QR Code
        qrcode = new QRCode(qrcodeDiv, {
            text: url,
            width: 300,
            height: 300,
            colorDark: qrColorInput.value,
            colorLight: bgColorInput.value,
            correctLevel: QRCode.CorrectLevel.H
        });
        
        // Mostra o container do QR Code
        qrContainer.style.display = 'block';
        downloadBtn.style.display = 'inline-block';
        
        // Rola a página para mostrar o QR Code
        qrContainer.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Download do QR Code
    downloadBtn.addEventListener('click', function() {
        if (!qrcode) {
            alert('Gere um QR Code primeiro!');
            return;
        }
        
        // Opções para manter a transparência
        const options = {
            scale: 2,
            backgroundColor: null, // Fundo transparente
            logging: false,
            useCORS: true,
            allowTaint: true,
            windowWidth: document.querySelector('.qr-container').scrollWidth,
            windowHeight: document.querySelector('.qr-container').scrollHeight
        };

        html2canvas(document.querySelector('.qr-container'), options).then(canvas => {
            // Cria o link de download diretamente
            const link = document.createElement('a');
            link.download = 'qrcode_transparente.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    });
});