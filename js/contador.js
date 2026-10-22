// js/contador.js

/**
 * Evento fixo (hardcoded) da contagem regressiva.
 * Para trocar o evento, basta editar estes três campos.
 * - data: DD/MM/AAAA
 * - hora: HH:mm (horário local do navegador)
 */
const EVENTO = {
    nome: 'BTS World Tour | Arirang',
    data: '30/10/2026',
    hora: '20:00',
};

const MS_SEGUNDO = 1000;
const MS_MINUTO = 60 * MS_SEGUNDO;
const MS_HORA = 60 * MS_MINUTO;
const MS_DIA = 24 * MS_HORA;

/**
 * Converte "DD/MM/AAAA" e "HH:mm" em um objeto Date no horário local.
 * @param {string} data - Ex.: '22/10/2026'
 * @param {string} hora - Ex.: '20:00'
 * @returns {Date}
 */
function montarDataDoEvento(data, hora) {
    const [dia, mes, ano] = data.split('/').map(Number);
    const [horas, minutos] = hora.split(':').map(Number);
    return new Date(ano, mes - 1, dia, horas, minutos, 0, 0);
}

/**
 * Calcula quanto tempo falta entre dois instantes.
 * @param {Date} alvo - Momento do evento
 * @param {Date} agora - Momento atual
 * @returns {{dias:number, horas:number, minutos:number, segundos:number, totalMs:number}}
 */
function calcularTempoRestante(alvo, agora) {
    const totalMs = Math.max(0, alvo.getTime() - agora.getTime());

    return {
        dias: Math.floor(totalMs / MS_DIA),
        horas: Math.floor((totalMs % MS_DIA) / MS_HORA),
        minutos: Math.floor((totalMs % MS_HORA) / MS_MINUTO),
        segundos: Math.floor((totalMs % MS_MINUTO) / MS_SEGUNDO),
        totalMs,
    };
}

/**
 * Escolhe singular ou plural.
 */
function pluralizar(valor, singular, plural) {
    return valor === 1 ? singular : plural;
}

/**
 * Formata o número com pelo menos dois dígitos (ex.: 07).
 */
function doisDigitos(valor) {
    return String(valor).padStart(2, '0');
}

/**
 * Atualiza o texto de um bloco; anima apenas quando o valor muda.
 */
function atualizarValor(elemento, texto) {
    if (!elemento || elemento.textContent === texto) return;
    elemento.textContent = texto;
    elemento.classList.remove('tick');
    // Força reflow para reiniciar a animação
    void elemento.offsetWidth;
    elemento.classList.add('tick');
}

function iniciarContador() {
    const alvo = montarDataDoEvento(EVENTO.data, EVENTO.hora);

    const el = {
        card: document.querySelector('.countdown-card'),
        nome: document.getElementById('eventName'),
        data: document.getElementById('eventDate'),
        hora: document.getElementById('eventTime'),
        dias: document.getElementById('daysValue'),
        horas: document.getElementById('hoursValue'),
        minutos: document.getElementById('minutesValue'),
        segundos: document.getElementById('secondsValue'),
        diasLabel: document.getElementById('daysLabel'),
        horasLabel: document.getElementById('hoursLabel'),
        minutosLabel: document.getElementById('minutesLabel'),
        segundosLabel: document.getElementById('secondsLabel'),
        resumo: document.getElementById('countdownSummary'),
        iniciado: document.getElementById('eventStarted'),
    };

    el.nome.textContent = EVENTO.nome;
    el.data.textContent = EVENTO.data;
    el.hora.textContent = EVENTO.hora;
    document.title = `${EVENTO.nome} - Contagem Regressiva`;

    let temporizador = null;

    function atualizar() {
        const t = calcularTempoRestante(alvo, new Date());

        atualizarValor(el.dias, doisDigitos(t.dias));
        atualizarValor(el.horas, doisDigitos(t.horas));
        atualizarValor(el.minutos, doisDigitos(t.minutos));
        atualizarValor(el.segundos, doisDigitos(t.segundos));

        el.diasLabel.textContent = pluralizar(t.dias, 'dia', 'dias');
        el.horasLabel.textContent = pluralizar(t.horas, 'hora', 'horas');
        el.minutosLabel.textContent = pluralizar(t.minutos, 'minuto', 'minutos');
        el.segundosLabel.textContent = pluralizar(t.segundos, 'segundo', 'segundos');

        if (t.totalMs === 0) {
            el.card.classList.add('is-finished');
            el.iniciado.hidden = false;
            el.resumo.textContent = '';
            clearInterval(temporizador);
            return;
        }

        el.resumo.textContent =
            `Faltam ${t.dias} ${pluralizar(t.dias, 'dia', 'dias')}, ` +
            `${t.horas} ${pluralizar(t.horas, 'hora', 'horas')}, ` +
            `${t.minutos} ${pluralizar(t.minutos, 'minuto', 'minutos')} e ` +
            `${t.segundos} ${pluralizar(t.segundos, 'segundo', 'segundos')} para o evento.`;
    }

    atualizar();
    // Recalcula a partir do relógio real a cada segundo (sem acumular atraso)
    temporizador = setInterval(atualizar, 1000);
}

document.addEventListener('DOMContentLoaded', iniciarContador);
