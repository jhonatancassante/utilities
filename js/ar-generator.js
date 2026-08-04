// js/ar-generator.js

document.addEventListener('DOMContentLoaded', () => {
    const arForm = document.getElementById('arForm');
    const cepInput = document.getElementById('cep');
    const nomeInput = document.getElementById('nome');
    const enderecoInput = document.getElementById('endereco');
    const numeroInput = document.getElementById('numero');
    const complementoInput = document.getElementById('complemento');
    const bairroInput = document.getElementById('bairro');
    const ufSelect = document.getElementById('uf');
    const cidadeSelect = document.getElementById('cidade');
    const observacaoInput = document.getElementById('observacao');

    const tableSection = document.getElementById('tableSection');
    const tableBody = document.getElementById('tableBody');
    const countRegistros = document.getElementById('countRegistros');
    const btnImprimir = document.getElementById('btnImprimir');
    const btnLimpar = document.getElementById('btnLimpar');

    let registros = [];
    let logoBase64 = null;

    loadLogo();

    // 1. MÁSCARAS E VALIDAÇÕES
    cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        }
        e.target.value = value;
    });

    numeroInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });

    // 2. API DO IBGE
    loadUFs();

    async function loadUFs() {
        try {
            const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
            const ufs = await res.json();
            ufSelect.innerHTML = '<option value="">Selecione...</option>';
            ufs.forEach((uf) => {
                const option = document.createElement('option');
                option.value = uf.sigla;
                option.textContent = uf.sigla;
                ufSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Erro ao carregar UFs do IBGE:', err);
            ufSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    ufSelect.addEventListener('change', async (e) => {
        const uf = e.target.value;
        cidadeSelect.innerHTML = '<option value="">Carregando...</option>';
        cidadeSelect.disabled = true;

        if (!uf) {
            cidadeSelect.innerHTML = '<option value="">Selecione a UF primeiro</option>';
            return;
        }

        try {
            const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
            const cidades = await res.json();
            cidadeSelect.innerHTML = '<option value="">Selecione a cidade...</option>';
            cidades.forEach((c) => {
                const option = document.createElement('option');
                option.value = c.nome;
                option.textContent = c.nome;
                cidadeSelect.appendChild(option);
            });
            cidadeSelect.disabled = false;
        } catch (err) {
            console.error('Erro ao carregar cidades:', err);
            cidadeSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    });

    // 3. INCLUIR REGISTRO
    arForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const novoRegistro = {
            id: Date.now(),
            cep: cepInput.value.trim(),
            nome: nomeInput.value.trim(),
            endereco: enderecoInput.value.trim(),
            numero: numeroInput.value.trim(),
            complemento: complementoInput.value.trim(),
            bairro: bairroInput.value.trim(),
            uf: ufSelect.value,
            cidade: cidadeSelect.value,
            observacao: observacaoInput.value.trim()
        };

        registros.push(novoRegistro);
        renderTable();

        arForm.reset();
        cidadeSelect.innerHTML = '<option value="">Selecione a UF primeiro</option>';
        cidadeSelect.disabled = true;
        cepInput.focus();
    });

    function renderTable() {
        tableBody.innerHTML = '';
        countRegistros.textContent = registros.length;

        if (registros.length === 0) {
            tableSection.style.display = 'none';
            return;
        }

        tableSection.style.display = 'block';

        registros.forEach((item, idx) => {
            const tr = document.createElement('tr');

            const endCompleto = `${item.endereco}, ${item.numero}${item.complemento ? ' (' + item.complemento + ')' : ''}`;

            tr.innerHTML = `
				<td><strong>${escapeHtml(item.nome)}</strong></td>
				<td>${escapeHtml(endCompleto)}</td>
				<td>${escapeHtml(item.bairro)}</td>
				<td>${escapeHtml(item.cidade)}/${item.uf}</td>
				<td>${item.cep}</td>
				<td>${escapeHtml(item.observacao || '-')}</td>
				<td class="text-center">
					<button class="btn-delete" title="Excluir registro" aria-label="Excluir" data-index="${idx}">
						<i class="fas fa-trash-alt"></i>
					</button>
				</td>
			`;
            tableBody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                registros.splice(index, 1);
                renderTable();
            });
        });
    }

    btnLimpar.addEventListener('click', () => {
        if (confirm('Deseja realmente limpar todos os registros cadastrados?')) {
            registros = [];
            arForm.reset();
            cidadeSelect.innerHTML = '<option value="">Selecione a UF primeiro</option>';
            cidadeSelect.disabled = true;
            renderTable();
        }
    });

    function loadLogo() {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = '../assets/logo_correios.gif';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            logoBase64 = canvas.toDataURL('image/png');
        };
        img.onerror = () => {
            console.warn('Logo dos correios não encontrado em assets/logo_correios.gif');
        };
    }

    btnImprimir.addEventListener('click', () => {
        if (registros.length === 0) return;
        generateARPDF(registros, logoBase64);
    });

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // =====================================================
    // FUNÇÃO PARA PREENCHIMENTO AUTOMÁTICO (MODO TESTE)
    // Descomente a linha abaixo para usar os dados de teste.
    preencherDadosTeste();
    // =====================================================

    async function preencherDadosTeste() {
        // Aguarda as UFs serem carregadas (enquanto houver só a opção "Selecione...")
        while (ufSelect.options.length <= 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Seleciona SP e dispara o evento para carregar as cidades
        ufSelect.value = 'SP';
        ufSelect.dispatchEvent(new Event('change'));

        // Aguarda as cidades carregarem
        while (cidadeSelect.options.length <= 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Preenche todos os campos (a máscara do CEP já está formatada)
        cepInput.value = '13386-082';
        nomeInput.value = 'Jhonatan Cassante';
        enderecoInput.value = 'Rua José Roberto Muniz';
        numeroInput.value = '27';
        complementoInput.value = 'Casa';
        bairroInput.value = 'Jardim Santa Rita I';
        cidadeSelect.value = 'Nova Odessa';
        observacaoInput.value = 'Protocolo 1234/2026 XXXXXX XXXX XXXXXXXXX XXXXXXXX XXXXXXXX';
    }
});

function generateARPDF(registros, logoBase64) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const arWidth = 140;   // 140mm
    const arHeight = 94;   // 94mm
    const pageX = (210 - arWidth) / 2; // Centralizado no A4
    const yTop = 25;
    const yBottom = 155;

    registros.forEach((item, index) => {
        const isSecondOnPage = index % 2 === 1;
        if (index > 0 && !isSecondOnPage) {
            doc.addPage();
        }

        const startY = isSecondOnPage ? yBottom : yTop;
        drawSingleAR(doc, pageX, startY, arWidth, arHeight, item, logoBase64);
    });

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    doc.save(`AR_Correios_${timestamp}.pdf`);
}

function drawSingleAR(doc, x, y, w, h, data, logoBase64) {
    doc.setLineWidth(0.35);
    doc.setDrawColor(0);

    // Borda Externa Principal
    doc.rect(x, y, w, h);

    // Faixa Lateral Esquerda (Área de Cola)
    const leftColW = 8;
    doc.line(x + leftColW, y, x + leftColW, y + h);

    // Linha Tracejada Visual na Faixa de Cola
    doc.setLineDashPattern([0.3, 0.5], 0);
    doc.line(x + leftColW - 1, y, x + leftColW - 1, y + h);
    doc.setLineDashPattern([], 0); // Restaura linha contínua

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('(ÁREA DE COLA NO VERSO)', x + 5, y + (h / 2) + 18, { angle: 90 });

    // Coluna Direita (Postagem e Carimbo)
    const rightColX = x + 106;
    doc.line(rightColX, y, rightColX, y + 52);
    doc.line(rightColX, y + 59, rightColX, y + h);

    // --- CABEÇALHO ---
    const hHeader = 8;
    doc.line(x + leftColW, y + hHeader, x + w, y + hHeader); // linha baixo cabeçalho

    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', x + 9.5, y + 1.2, 28, 5.5);
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Correios', x + 10, y + 5.5);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('AVISO DE\nRECEBIMENTO', x + 50, y + 3);

    doc.setFontSize(15);
    doc.text('AR', x + 85, y + 6);

    // Coluna Direita: Data de Postagem
    doc.setFontSize(6);
    doc.text('DATA DE POSTAGEM', rightColX + 0.7, y + 2.5);

    // --- CORPO CENTRAL (DESTINATÁRIO E DEVOLUÇÃO) ---
    const hDestDev = 44;
    const yDestDevEnd = y + hHeader + hDestDev;
    doc.line(x + leftColW, yDestDevEnd, x + w, yDestDevEnd); // Linha debaixo do corpo central

    // Destinatário
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('DESTINATÁRIO', x + 10, y + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.text(data.nome.toUpperCase(), x + 10, y + 14);
    doc.text(`${data.endereco.toUpperCase()}, ${data.numero}${data.complemento ? ' ' + data.complemento.toUpperCase() : ''}`, x + 10, y + 16.5);
    doc.text(data.bairro.toUpperCase(), x + 10, y + 19);
    doc.text(`${data.cep} - ${data.cidade.toUpperCase()} - ${data.uf.toUpperCase()}`, x + 10, y + 21.5);

    // Barcode / Código de Registro Placeholder
    doc.setLineDashPattern([0.3, 0.5], 0);
    doc.rect(x + 28, y + 30, 52, 3.5);
    doc.setLineDashPattern([], 0); // Restaura linha contínua
    doc.setFontSize(5);
    doc.text('(CÓDIGO DE BARRAS OU Nº DE REGISTRO DO OBJETO)', x + 30, y + 32.5);

    // Endereço para Devolução do AR
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('ENDEREÇO PARA DEVOLUÇÃO DO AR', x + 10, y + 40);

    doc.setFont('helvetica', 'normal');
    doc.text('Município de Nova Odessa - Setor de Tributação e Dívida Ativa'.toUpperCase(), x + 10, y + 42.5);
    doc.text('Avenida João Pessoa, 777'.toUpperCase(), x + 10, y + 45);
    doc.text('Centro'.toUpperCase(), x + 10, y + 47.5);
    doc.text('13380-017 - Nova Odessa - SP'.toUpperCase(), x + 10, y + 50);

    // Divisões da Coluna Direita (Unidade de Postagem & Carimbo)
    const yUnidPostagem = y + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('UNIDADE DE POSTAGEM', rightColX + 0.7, yUnidPostagem + 2.5);

    const yCarimbo = y + 16;
    doc.line(rightColX, yCarimbo, x + w, yCarimbo);
    doc.text('CARIMBO\nUNIDADE DE ENTREGA', rightColX + 17, yCarimbo + 2.5, { align: 'center' });

    // --- SEÇÃO INFERIOR: TENTATIVAS, OBSERVAÇÃO, MOTIVO DE DEVOLUÇÃO ---
    const yInferiorEnd = y + 80;

    // Coluna Tentativas de Entrega
    const colTentativasW = 48;
    const xMotivoStart = x + leftColW + colTentativasW;
    doc.line(xMotivoStart, yDestDevEnd, xMotivoStart, yInferiorEnd);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text('TENTATIVAS DE ENTREGA', x + 18, yDestDevEnd + 2.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('1ª ______/______/______     ______:______h', x + 9.5, yDestDevEnd + 9);
    doc.text('2ª ______/______/______     ______:______h', x + 9.5, yDestDevEnd + 16);
    doc.text('3ª ______/______/______     ______:______h', x + 9.5, yDestDevEnd + 23);

    // Observação
    const yObsEnd = yDestDevEnd + 7;
    doc.line(xMotivoStart, yObsEnd, x + w, yObsEnd); // Linha debaixo da observação
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('OBSERVAÇÃO:', xMotivoStart + 0.5, yDestDevEnd + 2.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    if (data.observacao) {
        doc.text(doc.splitTextToSize(data.observacao.toUpperCase(), 60), xMotivoStart + 18, yDestDevEnd + 2.5);
    }

    // Motivo de Devolução
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('MOTIVO DE DEVOLUÇÃO', xMotivoStart + 12, yObsEnd + 2.5);

    // Lista de opções idêntica ao leiaute oficial
    const motivosCol1 = [
        'Mudou-se',
        'Endereço insuficiente',
        'Não existe o número',
        'Desconhecido',
        'Outros: _______________________________'
    ];

    const motivosCol2 = [
        'Recusado',
        'Não procurado',
        'Ausente',
        'Falecido'
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);

    // Coluna 1 do Motivo de Devolução
    let yMotivoPos = yObsEnd + 7;
    motivosCol1.forEach((item, index) => {
        const num = index + (index === 4 ? 5 : 1);
        doc.rect(xMotivoStart + 2, yMotivoPos - 3, 2.5, 2.5); // quadradinho de marcação
        doc.text(num.toString(), xMotivoStart + 2.7, yMotivoPos - 1);
        doc.text(item, xMotivoStart + 5.5, yMotivoPos - 1);
        yMotivoPos += 3.2;
    });

    // Coluna 2 do Motivo de Devolução
    yMotivoPos = yObsEnd + 7;
    motivosCol2.forEach((item, index) => {
        const num = index + 5;
        doc.rect(xMotivoStart + 32, yMotivoPos - 3, 2.5, 2.5); // quadradinho de marcação
        doc.text(num.toString(), xMotivoStart + 32.7, yMotivoPos - 1);
        doc.text(item, xMotivoStart + 35.5, yMotivoPos - 1);
        yMotivoPos += 3.2;
    });

    // Rubrica e Matrícula do Carteiro
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('RUBRICA E MATRÍCULA DO', rightColX + 0.7, yDestDevEnd + 9.5);
    doc.text('CARTEIRO', rightColX + 0.7, yDestDevEnd + 12);

    // --- LINHAS FINAIS: ASSINATURA, DATA, NOME E DOC ---
    const yAssinatura = y + 80;
    const yNome = y + 87;

    doc.line(x + leftColW, yAssinatura, x + w, yAssinatura);
    doc.line(x + leftColW, yNome, x + w, yNome);

    // Assinatura do Recebedor / Data de Entrega
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('ASSINATURA DO RECEBEDOR', x + 8.4, yAssinatura + 2.5);
    doc.text('DATA DE ENTREGA', rightColX + 0.7, yAssinatura + 2.5);

    // Nome Legível / Nº Doc de Identidade
    doc.text('NOME LEGÍVEL DO RECEBEDOR', x + 8.4, yNome + 2.5);
    doc.text('Nº DOC. DE IDENTIDADE', rightColX + 0.7, yNome + 2.5);
}
