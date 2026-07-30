// js/cpf-tester.js

document.addEventListener('DOMContentLoaded', () => {
    const cpfInput = document.getElementById('cpfInput');
    const cpfStatus = document.getElementById('cpfStatus');
    const testBtn = document.getElementById('testBtn');

    const dvSection = document.getElementById('dvSection');
    const baseCpf = document.getElementById('baseCpf');
    const correctDv = document.getElementById('correctDv');
    const formattedCorrectCpf = document.getElementById('formattedCorrectCpf');

    const resultsContainer = document.getElementById('resultsContainer');
    const resultsList = document.getElementById('resultsList');
    const resultsCount = document.getElementById('resultsCount');

    // --- 1. MÁSCARA E VALIDAÇÃO EM TEMPO REAL ---

    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 11) {
            value = value.slice(0, 11);
        }

        e.target.value = formatCPF(value);

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

        // A. Exibe o Dígito Verificador Correto para os primeiros 9 dígitos
        showCorrectVerifiers(rawCPF);

        // B. Testa e exibe todas as outras combinações válidas por troca de 1 dígito
        const validVariations = generateAndTestCPFVariations(rawCPF);
        displayResults(validVariations);
    });

    // Permite disparar a busca ao pressionar a tecla Enter no campo de CPF
    cpfInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita recarregar a página caso esteja em um form
            testBtn.click(); // Dispara o clique do botão
        }
    });

    // --- 3. CÁLCULO E EXIBIÇÃO DO DÍGITO VERIFICADOR CORRETO ---

    function showCorrectVerifiers(cpf) {
        const base9 = cpf.slice(0, 9);
        const calculatedDV = calculateVerifiers(base9);
        const correctCPF = base9 + calculatedDV;

        baseCpf.textContent = formatCPF(base9 + '00').slice(0, 11); // Exibe no formato 000.000.000
        correctDv.textContent = calculatedDV;
        formattedCorrectCpf.textContent = formatCPF(correctCPF);

        dvSection.style.display = 'block';
    }

    function calculateVerifiers(base9) {
        // Cálculo do 1º dígito
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(base9.charAt(i)) * (10 - i);
        }
        let rev1 = 11 - (sum % 11);
        if (rev1 === 10 || rev1 === 11) rev1 = 0;

        // Cálculo do 2º dígito
        const base10 = base9 + rev1;
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(base10.charAt(i)) * (11 - i);
        }
        let rev2 = 11 - (sum % 11);
        if (rev2 === 10 || rev2 === 11) rev2 = 0;

        return `${rev1}${rev2}`;
    }

    // --- 4. TESTE DE TODAS AS POSSIBILIDADES DE ERRO (VARREDURA POSIÇÃO A POSIÇÃO) ---

    function generateAndTestCPFVariations(originalCPF) {
        const validList = [];
        const uniqueSet = new Set();

        const digits = originalCPF.split('');

        for (let pos = 0; pos < 11; pos++) {
            for (let d = 0; d <= 9; d++) {
                const currentDigitStr = d.toString();

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

    // --- 5. ALGORITMO OFICIAL DE VALIDAÇÃO DO CPF (MÓDULO 11) ---

    function isValidCPF(cpf) {
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;

        const base9 = cpf.slice(0, 9);
        const expectedDV = calculateVerifiers(base9);

        return cpf.slice(9) === expectedDV;
    }

    // --- 6. FUNÇÕES AUXILIARES DE FORMATAÇÃO E EXIBIÇÃO ---

    function formatCPF(cpf) {
        return cpf
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    function displayResults(results) {
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
