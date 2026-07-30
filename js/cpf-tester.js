document.addEventListener('DOMContentLoaded', () => {
    const cpfInput = document.getElementById('cpfInput');
    const cpfStatus = document.getElementById('cpfStatus');
    const testBtn = document.getElementById('testBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsList = document.getElementById('resultsList');
    const resultsCount = document.getElementById('resultsCount');

    // --- 1. MÁSCARA E VALIDAÇÃO EM TEMPO REAL ---

    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove não dígitos

        if (value.length > 11) {
            value = value.slice(0, 11);
        }

        // Aplica a máscara no input
        e.target.value = formatCPF(value);

        // Valida dinamicamente caso o CPF esteja preenchido por completo
        if (value.length === 11) {
            if (isValidCPF(value)) {
                cpfInput.className = 'valid';
                cpfStatus.className = 'status-badge valid';
                cpfStatus.textContent = '✓ CPF Válido';
            } else {
                cpfInput.className = 'invalid';
                cpfStatus.className = 'status-badge invalid';
                cpfStatus.textContent = '✕ CPF Inválido';
            }
        } else {
            cpfInput.className = '';
            cpfStatus.textContent = '';
        }
    });

    // --- 2. EVENTO DE CLIQUE DO BOTÃO DE TESTES ---

    testBtn.addEventListener('click', () => {
        const rawCPF = cpfInput.value.replace(/\D/g, '');

        if (rawCPF.length !== 11) {
            alert('Por favor, preencha um CPF com 11 dígitos para testar.');
            return;
        }

        const validVariations = generateAndTestCPFVariations(rawCPF);
        displayResults(validVariations, rawCPF);
    });

    // --- 3. LÓGICA DE TESTE DE TODAS AS POSSIBILIDADES DE ERRO ---

    function generateAndTestCPFVariations(originalCPF) {
        const validList = [];
        const uniqueSet = new Set(); // Para evitar duplicados

        const digits = originalCPF.split('');

        // Varre cada uma das 11 posições do CPF
        for (let pos = 0; pos < 11; pos++) {
            const originalDigit = digits[pos];

            // Para cada posição, testa alterar por dígitos de 0 a 9
            for (let d = 0; d <= 9; d++) {
                const currentDigitStr = d.toString();

                // Cria uma cópia com a alteração na posição atual
                const tempDigits = [...digits];
                tempDigits[pos] = currentDigitStr;
                const candidateCPF = tempDigits.join('');

                if (isValidCPF(candidateCPF) && !uniqueSet.has(candidateCPF)) {
                    uniqueSet.add(candidateCPF);
                    validList.push({
                        cpf: candidateCPF,
                        isOriginal: candidateCPF === originalCPF,
                        changedIndex: candidateCPF === originalCPF ? null : pos,
                    });
                }
            }
        }

        return validList;
    }

    // --- 4. ALGORITMO OFICIAL DE VALIDAÇÃO DE CPF (MÓDULO 11) ---

    function isValidCPF(cpf) {
        if (cpf.length !== 11) return false;

        // Rejeita sequências repetidas conhecidas (Ex: 111.111.111-11)
        if (/^(\d)\1{10}$/.test(cpf)) return false;

        // Validação do Primeiro Dígito Verificador
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(9))) return false;

        // Validação do Segundo Dígito Verificador
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(cpf.charAt(10))) return false;

        return true;
    }

    // --- 5. FUNÇÕES AUXILIARES DE FORMATAÇÃO E EXIBIÇÃO ---

    function formatCPF(cpf) {
        return cpf
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    function displayResults(results, originalCPF) {
        resultsList.innerHTML = '';
        resultsCount.textContent = results.length;
        resultsContainer.style.display = 'block';

        if (results.length === 0) {
            resultsList.innerHTML =
                '<li style="justify-content: center; color: #777;">Nenhuma variação válida encontrada.</li>';
            return;
        }

        results.forEach((item) => {
            const li = document.createElement('li');
            if (item.isOriginal) {
                li.classList.add('original-cpf');
            }

            const formatted = formatCPF(item.cpf);
            let tagInfo = '';

            if (item.isOriginal) {
                tagInfo = '<span class="badge">CPF Original Digitado</span>';
            } else {
                tagInfo = `<span class="badge">Alterado Dígito na Pos. ${item.changedIndex + 1}</span>`;
            }

            li.innerHTML = `
                <span>${formatted}</span>
                ${tagInfo}
            `;

            resultsList.appendChild(li);
        });
    }
});
