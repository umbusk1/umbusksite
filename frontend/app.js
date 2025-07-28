// Configuración
const CONFIG = {
    API_ENDPOINT: 'https://umbusksite.vercel.app/api/chat',
    USE_MOCK_DATA: false, // Por ahora usamos datos de prueba
    COMET_COUNT: 12,
    DIALOGUE_DELAY: 2500,
    DIALOGUE_DISPLAY_TIME: 5000
};

const API_BASE = 'https://umbusksite.vercel.app';

function getOrCreateSessionId() {
    let sessionId = localStorage.getItem('umbusk_session_id');
    if (!sessionId) {
        sessionId = 'umbusk_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('umbusk_session_id', sessionId);
    }
    return sessionId;
}

async function saveConversation(dialogue) {
    try {
        if (!dialogue || !dialogue.lines) {
            console.error('Diálogo inválido:', dialogue);
            return;
        }

        const sessionId = getOrCreateSessionId();

        const generatedText = dialogue.lines.map(line => {
            const voice = line.voice === 1 ? 'Claude' : 'ChatGPT';
            return `${voice}: ${line.text}`;
        }).join('\n');

        const response = await fetch(`${API_BASE}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                prompt_type: dialogue.theme || 'cosmos',
                generated_text: generatedText
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Conversación guardada:', data);

            // Actualizar el historial si está abierto
            if (historyManager.isOpen) {
                historyManager.loadHistory();
            }
        }
    } catch (error) {
        console.error('Error guardando conversación:', error);
    }
}

// Configuración de modos
const COSMOS_MODES = {
    normal: {
        cometCount: 12,
        speedMultiplier: 1,
        sizeMultiplier: 1,
        orbitRange: { min: 150, max: 300 }
    },
    zen: {
        cometCount: 5,
        speedMultiplier: 0.3,
        sizeMultiplier: 1.5,
        orbitRange: { min: 100, max: 200 }
    },
    chaos: {
        cometCount: 20,
        speedMultiplier: 3,
        sizeMultiplier: 0.8,
        orbitRange: { min: 50, max: 400 }
    }
};

let currentMode = 'normal';

// Estado global
let comets = [];
let currentDialogue = 0;
let isDialogueActive = false;
let isFirstVisit = !localStorage.getItem('umbuskVisited');

// Canvas setup
const canvas = document.getElementById('cosmos');
const ctx = canvas ? canvas.getContext('2d') : null;

function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

                // Ajustar para móvil
		        if (window.innerWidth < 768) {
		            canvas.style.marginTop = '90px'; // Espacio para header + ticker
		        } else {
		            canvas.style.marginTop = '0';
        }

    }
}

// Clase Cometa mejorada
class Comet {
    constructor(x, y, index) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.index = index;

        // Obtener configuración del modo actual UNA SOLA VEZ
        const mode = COSMOS_MODES[currentMode];
        const isMobile = window.innerWidth < 768;

        // Parámetros únicos para cada cometa
        this.angle = (Math.PI * 2 / CONFIG.COMET_COUNT) * index;

        // Aplicar configuración del modo
        const range = mode.orbitRange;
        this.orbitRadius = isMobile ?
            (range.min * 0.5 + Math.random() * range.max * 0.3) :
            (range.min + Math.random() * (range.max - range.min));

        this.speed = (0.0002 + Math.random() * 0.0003) * mode.speedMultiplier;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;
        this.size = (2 + Math.random() * 2) * mode.sizeMultiplier;

        // Parámetros de movimiento complejo
        this.spiralFactor = 0.1 + Math.random() * 0.1;
        this.wobbleFreq = 3 + Math.random() * 2;
        this.wobbleAmp = 10 + Math.random() * 20;
    }

    update() {
        this.angle += this.speed;
        this.pulsePhase += this.pulseSpeed;

        // Movimiento espiral con perturbaciones
        const spiral = this.orbitRadius * (1 + this.spiralFactor * Math.sin(this.angle * 2));
        const wobbleX = this.wobbleAmp * Math.sin(this.angle * this.wobbleFreq);
        const wobbleY = this.wobbleAmp * Math.cos(this.angle * this.wobbleFreq * 1.3);

        // Suavizar el movimiento
        const targetX = this.baseX + Math.cos(this.angle) * spiral + wobbleX;
        const targetY = this.baseY + Math.sin(this.angle) * spiral + wobbleY;

        this.x += (targetX - this.x) * 0.02;
        this.y += (targetY - this.y) * 0.02;
    }

    draw() {
        const pulse = 1 + 0.3 * Math.sin(this.pulsePhase);
        const opacity = 0.3 + 0.2 * Math.sin(this.pulsePhase);

        // Estela dinámica
        const tailLength = 40 + 20 * Math.sin(this.pulsePhase);
        const gradient = ctx.createLinearGradient(
            this.x, this.y,
            this.x - Math.cos(this.angle) * tailLength,
            this.y - Math.sin(this.angle) * tailLength
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x - Math.cos(this.angle) * tailLength,
            this.y - Math.sin(this.angle) * tailLength
        );
        ctx.stroke();

        // Núcleo
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();

        // Halo
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * pulse * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.05})`;
        ctx.fill();
    }

    isNear(x, y, threshold = 50) {
        const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return distance < threshold;
    }

    disturb() {
        this.angle += Math.random() * Math.PI * 0.5;
        this.orbitRadius = 150 + Math.random() * 150;
    }
}

// Sistema de diálogos mejorado para evitar SLOP
const mockDialogues = [
    {
        theme: "inception",
        lines: [
            { voice: 1, text: "¿Qué es un prototipo sino una pregunta materializada?" },
            { voice: 2, text: "Una hipótesis que respira." }
        ]
    },
    {
        theme: "process",
        lines: [
            { voice: 1, text: "El código no es el producto final." },
            { voice: 2, text: "Es el diálogo entre la intención y la posibilidad." }
        ]
    },
    {
        theme: "time",
        lines: [
            { voice: 1, text: "30 años de evolución tecnológica..." },
            { voice: 2, text: "Y apenas estamos empezando a hacer las preguntas correctas." }
        ]
    },
    {
        theme: "collaboration",
        lines: [
            { voice: 1, text: "Cada cliente trae un universo de posibilidades." },
            { voice: 2, text: "Nuestro trabajo es encontrar la constelación perfecta." }
        ]
    },
    {
        theme: "innovation",
        lines: [
            { voice: 1, text: "La innovación no es agregar complejidad." },
            { voice: 2, text: "Es encontrar la simplicidad al otro lado del caos." }
        ]
    }
];

async function getDialogue() {
    if (CONFIG.USE_MOCK_DATA) {
        return mockDialogues[currentDialogue % mockDialogues.length];
    } else {
        try {
            showLoading(true);
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: 'cosmos_interaction',
                    dialogueNumber: currentDialogue,
                    timestamp: new Date().toISOString(),
                    random: Math.random()
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            showLoading(false);
            return data;
        } catch (error) {
            console.error('Error getting dialogue:', error);
            showLoading(false);
            updateConnectionStatus('Error de conexión', false);
            return mockDialogues[currentDialogue % mockDialogues.length];
        }
    }
}

function showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.classList.toggle('active', show);
    }
}

function showLoadingWithProgress() {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.classList.add('active');
        loader.innerHTML = '<div class="pulse"></div><div style="font-size: 19px; margin-top: 10px; opacity: 0.6;">Conectando con 2 mentes de IA...</div>';
    }
}

function updateConnectionStatus(message, isConnected) {
    const status = document.getElementById('connection-status');
    if (status) {
        status.textContent = message;
        status.className = `connection-status show ${isConnected ? 'connected' : 'error'}`;
    }
}

// Sistema de compartir diálogos
let currentDialogueData = null;

// Modificar displayDialogue para guardar el diálogo actual
async function displayDialogue() {
    if (isDialogueActive) return;

    isDialogueActive = true;
    const container = document.getElementById('dialogue-content');
    if (!container) return;

    container.innerHTML = '';

    // Ocultar botón de compartir al empezar nuevo diálogo
    const shareBtn = document.getElementById('share-dialogue');
    if (shareBtn) {
        shareBtn.classList.remove('show');
    }

    // Mostrar indicador de carga con progreso
    showLoadingWithProgress();

    const dialogue = await getDialogue();

    // Guardar diálogo actual para compartir
    currentDialogueData = dialogue;
    // Guardar el diálogo en la base de datos
	await saveConversation(dialogue);

    // Ocultar indicador
    showLoading(false);

    let lineIndex = 0;

    function showNextLine() {
        if (lineIndex < dialogue.lines.length) {
            const line = dialogue.lines[lineIndex];
            const div = document.createElement('div');
            div.className = `dialogue-line voice-${line.voice}`;
            div.textContent = line.text;
            container.appendChild(div);

            lineIndex++;
            setTimeout(showNextLine, CONFIG.DIALOGUE_DELAY);
        } else {
            // Mostrar botón de compartir
            setTimeout(() => {
                if (shareBtn) {
                    shareBtn.classList.add('show');
                }
            }, 1000);

            // Esperar más tiempo antes de desvanecer
            setTimeout(() => {
                // Fade out más lento
                Array.from(container.children).forEach((child, index) => {
                    setTimeout(() => {
                        child.style.transition = 'opacity 1s ease';
                        child.style.opacity = '0';
                    }, index * 300);
                });

                setTimeout(() => {
                    container.innerHTML = '';
                    isDialogueActive = false;
                    // Ocultar botón de compartir
                    if (shareBtn) {
                        shareBtn.classList.remove('show');
                    }
                }, 2500);
            }, CONFIG.DIALOGUE_DISPLAY_TIME);
        }
    }

    showNextLine();
}

// Funciones de compartir
function openShareModal() {
    if (!currentDialogueData) return;

    const modal = document.getElementById('share-modal');
    const preview = document.getElementById('share-preview');

    if (!modal || !preview) return;

    // Generar preview
    let previewHTML = '';
    currentDialogueData.lines.forEach(line => {
        const voiceClass = line.voice === 1 ? 'voice-claude' : 'voice-gpt';
        const voiceName = line.voice === 1 ? 'Claude' : 'ChatGPT';
        previewHTML += `
            <div class="dialogue-item ${voiceClass}">
                <strong>${voiceName}:</strong><br>
                ${line.text}
            </div>
        `;
    });

    preview.innerHTML = previewHTML;
    modal.classList.add('active');
}

function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function shareToTwitter() {
    if (!currentDialogueData) return;

    // Crear texto para Twitter (máximo 280 caracteres)
    let text = "Diálogo fascinante en @umbusk:\n\n";
    const firstLine = currentDialogueData.lines[0].text;
    text += firstLine.substring(0, 100) + "...";
    text += "\n\n🌟 Descubre más en ";

    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

    window.open(twitterUrl, '_blank');
}

function shareToLinkedIn() {
    if (!currentDialogueData) return;

    const url = window.location.href;
    const title = "Diálogo entre 2 mentes de IA";
    const summary = currentDialogueData.lines[0].text;

    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

    window.open(linkedInUrl, '_blank');
}

function downloadDialogueImage() {
    // Crear canvas temporal
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Configurar tamaño
    canvas.width = 800;
    canvas.height = 600;

    // Fondo
    const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
    gradient.addColorStop(0, '#0a0a0f');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Logo/Título
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '24px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText('UMBUSK', 400, 50);

    ctx.font = '14px Helvetica';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Diálogo entre 2 mentes de IA', 400, 80);

    // Dibujar diálogos
    let y = 120;
    ctx.textAlign = 'left';
    ctx.font = '16px Georgia';

    currentDialogueData.lines.forEach((line, index) => {
        const x = line.voice === 1 ? 50 : 450;
        const align = line.voice === 1 ? 'left' : 'right';
        const name = line.voice === 1 ? 'Claude' : 'ChatGPT';

        ctx.textAlign = align;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px Helvetica';
        ctx.fillText(name, x, y);

        y += 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px Georgia';

        // Dividir texto en líneas
        const words = line.text.split(' ');
        let currentLine = '';
        const maxWidth = 300;

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine !== '') {
                ctx.fillText(currentLine, x, y);
                currentLine = word + ' ';
                y += 20;
            } else {
                currentLine = testLine;
            }
        });

        ctx.fillText(currentLine, x, y);
        y += 40;
    });

    // Fecha
    ctx.textAlign = 'center';
    ctx.font = '10px Helvetica';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText(new Date().toLocaleDateString('es-ES'), 400, 560);

    // Descargar
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `umbusk-dialogo-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Event listeners para compartir
document.addEventListener('DOMContentLoaded', () => {
    const shareBtn = document.getElementById('share-dialogue');
    const closeBtn = document.querySelector('.share-close');
    const modal = document.getElementById('share-modal');

    if (shareBtn) {
        shareBtn.addEventListener('click', openShareModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeShareModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeShareModal();
            }
        });
    }
});

// Inicialización del cosmos
function initComets() {
    if (!canvas) return;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Limpiar array de cometas
    comets = [];

    // Agregar una cometa especial
    const specialComet = new Comet(centerX, centerY - 100, CONFIG.COMET_COUNT);
    specialComet.isSpecial = true;
    specialComet.color = 'gold';
    comets.push(specialComet);

    for (let i = 0; i < CONFIG.COMET_COUNT; i++) {
        const angle = (Math.PI * 2 / CONFIG.COMET_COUNT) * i;
        const isMobile = window.innerWidth < 768;
        const distance = isMobile ? (80 + Math.random() * 60) : (200 + Math.random() * 100);
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        comets.push(new Comet(x, y, i));
    }
}

// Interacciones mejoradas
if (canvas) {
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Verificar click en cometas con área más grande
        let clickDetected = false;

        for (let comet of comets) {
            const distance = Math.sqrt((x - comet.x) ** 2 + (y - comet.y) ** 2);

            if (distance < 70) { // Aumentado de 50 a 70
                clickDetected = true;
                currentDialogue++;
                displayDialogue();
                comets.forEach(c => c.disturb());
                break;
            }
        }
    });

    // Soporte para touch en móviles
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Verificar touch en cometas
        for (let comet of comets) {
            if (comet.isNear(x, y, 70)) { // Área más grande en móvil
                currentDialogue++;
                displayDialogue();
                comets.forEach(c => c.disturb());
                break;
            }
        }
    });
}

// Animación principal
function animate() {
    if (!canvas || !ctx) return;
    // Fade trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Actualizar y dibujar cometas
    comets.forEach(comet => {
        comet.update();
        comet.draw();
    });

    requestAnimationFrame(animate);
}

// Sistema de ticker de navegación unificado
// Sistema de ticker de navegación bilingüe
function initializeNavigationTicker() {
    const tickerContent = document.getElementById('ticker-content');
    if (!tickerContent) return;

    // Detectar página actual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Crear HTML del ticker de navegación
    let html = '';

    // Para Home: mostrar Arqueología/Archaeology - Workflow/Workflow alternado
    if (currentPage === 'index.html' || currentPage === '') {
        for (let i = 0; i < 12; i++) {
            html += '<span class="ticker-nav-item">';
            html += '<a href="arqueologia.html" class="ticker-nav-link">';
            html += '<span class="es">ARQUEOLOGÍA</span>';
            html += '<span class="en">ARCHAEOLOGY</span>';
            html += '</a>';
            html += '</span>';
            html += '<img src="imagenes/circulo.png" class="ticker-separator" alt="">';

            html += '<span class="ticker-nav-item">';
            html += '<a href="workflow.html" class="ticker-nav-link">';
            html += '<span class="es">FLUJO DE TRABAJO</span>';
            html += '<span class="en">WORKFLOW</span>';
            html += '</a>';
            html += '</span>';
            html += '<img src="imagenes/circulo.png" class="ticker-separator" alt="">';
        }
    }
    // Para Workflow: mostrar Home - Arqueología alternado
    else if (currentPage === 'workflow.html') {
        for (let i = 0; i < 12; i++) {
            html += '<span class="ticker-nav-item">';
            html += '<a href="index.html" class="ticker-nav-link">';
            html += '<span class="es">INICIO</span>';
            html += '<span class="en">HOME</span>';
            html += '</a>';
            html += '</span>';
            html += '<img src="imagenes/circulo.png" class="ticker-separator" alt="">';

            html += '<span class="ticker-nav-item">';
            html += '<a href="arqueologia.html" class="ticker-nav-link">';
            html += '<span class="es">ARQUEOLOGÍA</span>';
            html += '<span class="en">ARCHAEOLOGY</span>';
            html += '</a>';
            html += '</span>';
            html += '<img src="imagenes/circulo.png" class="ticker-separator" alt="">';
        }
    }
    // Para Arqueología: mostrar Home - Workflow alternado
    else if (currentPage === 'arqueologia.html') {
        for (let i = 0; i < 12; i++) {
            html += '<span class="ticker-nav-item">';
            html += '<a href="index.html" class="ticker-nav-link">';
            html += '<span class="es">INICIO</span>';
            html += '<span class="en">HOME</span>';
            html += '</a>';
            html += '</span>';
            html += '<img src="imagenes/circulo.png" class="ticker-separator" alt="">';

            html += '<span class="ticker-nav-item">';
            html += '<a href="workflow.html" class="ticker-nav-link">';
            html += '<span class="es">FLUJO DE TRABAJO</span>';
            html += '<span class="en">WORKFLOW</span>';
            html += '</a>';
            html += '</span>';
            html += '<img src="imagenes/circulo.png" class="ticker-separator" alt="">';
        }
    }

    tickerContent.innerHTML = html;
}

// También actualizar el sistema de cambio de idioma para refrescar el ticker
window.setLanguage = function(lang) {
    const body = document.body;
    const selector = document.querySelector('.lang-selector-home') ||
                    document.querySelector('.lang-selector');

    if (lang === 'en') {
        body.classList.add('en');
        if (selector) {
            selector.classList.remove('active-es');
            selector.classList.add('active-en');
        }
    } else {
        body.classList.remove('en');
        if (selector) {
            selector.classList.remove('active-en');
            selector.classList.add('active-es');
        }
    }
    localStorage.setItem('language', lang);

    // Actualizar el ticker cuando cambia el idioma
    // (El CSS se encarga de mostrar/ocultar el idioma correcto)
}

// INICIALIZACIÓN PRINCIPAL
window.addEventListener('load', () => {
    // Solo si existe el canvas (en index.html)
    if (canvas) {
        resizeCanvas();
        initComets();
        animate();

        // Mostrar status en desarrollo
        if (CONFIG.USE_MOCK_DATA) {
            updateConnectionStatus('Modo desarrollo (sin API)', true);
        }
    }

    // Inicializar ticker de navegación (funciona en todas las páginas)
    initializeNavigationTicker();
});

// Resize handler
window.addEventListener('resize', () => {
    if (canvas) {
        resizeCanvas();
        // Reposicionar cometas proporcionalmente
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        comets.forEach((comet, index) => {
            comet.baseX = centerX;
            comet.baseY = centerY;
            // Reajustar la posición actual también
            const angle = (Math.PI * 2 / CONFIG.COMET_COUNT) * index;
            const distance = comet.orbitRadius * 0.5; // Reducir un poco el radio
            comet.x = centerX + Math.cos(angle) * distance;
            comet.y = centerY + Math.sin(angle) * distance;
        });
    }
});

// Sistema de historial
const historyManager = {
    isOpen: false,

async loadHistory() {
    try {
        const sessionId = getOrCreateSessionId();
        const response = await fetch(`${API_BASE}/api/history?session_id=${sessionId}&limit=50`);

        if (response.ok) {
            const data = await response.json();
            console.log('Historial cargado:', data);
            this.displayHistory(data.conversations || []);
        } else {
            console.error('Error response:', response.status, response.statusText);
            this.displayHistory([]);
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
        this.displayHistory([]);
    }
},

displayHistory(conversations) {
    const content = document.getElementById('history-content');
    if (!content) return;

    // Validar que conversations sea un array
    if (!Array.isArray(conversations)) {
        console.error('Conversations no es un array:', conversations);
        conversations = [];
    }

    if (conversations.length === 0) {
        content.innerHTML = '<p class="no-history">No hay diálogos guardados aún.</p>';
        return;
    }

    // Agrupar por fecha
    const groupedByDate = {};
    conversations.forEach(conv => {
        const date = new Date(conv.timestamp).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(conv);
    });

    // Crear HTML
    let html = '';
    Object.entries(groupedByDate).forEach(([date, convs]) => {
        html += `
            <div class="date-item">
                <div class="date-header" onclick="historyManager.toggleDate(this)">
                    <span class="date-text">${date}</span>
                    <span class="date-arrow">▼</span>
                </div>
                <div class="dialogues-content">
        `;

        convs.forEach((conv) => {
            const time = new Date(conv.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Parsear el texto generado
            const lines = conv.generated_text.split('\n');

            html += `
                <div class="dialogue-group">
            `;

            lines.forEach(line => {
                if (line.includes(':')) {
                    const [voice, ...textParts] = line.split(':');
                    const text = textParts.join(':').trim();
                    if (voice && text) {
                        html += `
                            <div class="dialogue-row">
                                <span class="voice-label">${voice}:</span>
                                <span class="voice-text">${text}</span>
                            </div>
                        `;
                    }
                }
            });

            html += `
                    <div class="dialogue-time">${time}</div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    content.innerHTML = html;
},

toggleDate(header) {
    header.classList.toggle('active');
    header.nextElementSibling.classList.toggle('active');
},

toggle() {
    this.isOpen = !this.isOpen;
    const container = document.getElementById('history-container');

    if (container) {
        if (this.isOpen) {
            container.classList.add('active');
            this.loadHistory();
        } else {
            container.classList.remove('active');
        }
    }
}
};

// Sistema de cambio de modos
function changeCosmosMode(newMode) {
    if (currentMode === newMode || !canvas) return;

    currentMode = newMode;
    const modeConfig = COSMOS_MODES[newMode];

    // Limpiar cometas existentes
    comets = [];

    // Actualizar configuración
    CONFIG.COMET_COUNT = modeConfig.cometCount;

    // Recrear cometas
    initComets();

    // Actualizar botones
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === newMode) {
            btn.classList.add('active');
        }
    });
}

// Event listeners para los botones de modo
window.addEventListener('DOMContentLoaded', () => {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            changeCosmosMode(btn.dataset.mode);
        });
    });

// Event listeners para el historial
    const historyTrigger = document.getElementById('history-trigger');
    const historyClose = document.getElementById('history-close');
    const historyContainer = document.getElementById('history-container');

    if (historyTrigger) {
        historyTrigger.addEventListener('click', () => {
            historyManager.toggle();
        });
    }

    if (historyClose) {
        historyClose.addEventListener('click', () => {
            historyManager.toggle();
        });
    }

    // Cerrar al hacer clic fuera de la caja
    if (historyContainer) {
        historyContainer.addEventListener('click', (e) => {
            // Si el click es exactamente en el contenedor (el fondo oscuro)
            if (e.target.id === 'history-container') {
                historyManager.toggle();
            }
        });
    }

    // También cerrar al hacer clic en cualquier parte cuando está abierto
    document.addEventListener('click', (e) => {
        if (historyManager.isOpen && historyContainer) {
            // Si el clic no es en el trigger ni dentro del contenedor
            const isClickInside = historyContainer.contains(e.target) ||
                                  (historyTrigger && historyTrigger.contains(e.target));

            if (!isClickInside) {
                historyManager.toggle();
            }
        }
    });
});

// AGREGAR ESTO A app.js PARA QUE FUNCIONE EN TODO EL SITIO

// Sistema global de cambio de idioma
function initLanguageSystem() {
    // Función para cambiar idioma
    window.toggleLanguage = function() {
        const body = document.body;
        // Buscar el selector - compatible con ambas clases
        const selector = document.querySelector('.lang-selector-home') ||
                        document.querySelector('.lang-selector');

        if (body.classList.contains('en')) {
            // Cambiar a Español
            body.classList.remove('en');
            if (selector) {
                selector.classList.remove('active-en');
                selector.classList.add('active-es');
            }
            localStorage.setItem('language', 'es');
        } else {
            // Cambiar a Inglés
            body.classList.add('en');
            if (selector) {
                selector.classList.remove('active-es');
                selector.classList.add('active-en');
            }
            localStorage.setItem('language', 'en');
        }
    }

    // Función para establecer un idioma específico
    window.setLanguage = function(lang) {
        const body = document.body;
        const selector = document.querySelector('.lang-selector-home') ||
                        document.querySelector('.lang-selector');

        if (lang === 'en') {
            body.classList.add('en');
            if (selector) {
                selector.classList.remove('active-es');
                selector.classList.add('active-en');
            }
        } else {
            body.classList.remove('en');
            if (selector) {
                selector.classList.remove('active-en');
                selector.classList.add('active-es');
            }
        }
        localStorage.setItem('language', lang);
    }
}

// Cargar idioma guardado al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar sistema de idiomas
    initLanguageSystem();

    // Cargar idioma guardado
    const savedLang = localStorage.getItem('language') || 'es';
    const selector = document.querySelector('.lang-selector-home') ||
                    document.querySelector('.lang-selector');

    if (savedLang === 'en') {
        document.body.classList.add('en');
        if (selector) {
            selector.classList.remove('active-es');
            selector.classList.add('active-en');
        }
    } else {
        // Asegurar que ES esté activo por defecto
        if (selector) {
            selector.classList.add('active-es');
        }
    }

    // Agregar event listeners a los enlaces de idioma
    const esLink = document.querySelector('a[onclick*="setLanguage(\'es\')"]') ||
                   document.querySelector('a[href="#es"]');
    const enLink = document.querySelector('a[onclick*="setLanguage(\'en\')"]') ||
                   document.querySelector('a[href="#en"]');

    if (esLink) {
        esLink.addEventListener('click', function(e) {
            e.preventDefault();
            setLanguage('es');
        });
    }

    if (enLink) {
        enLink.addEventListener('click', function(e) {
            e.preventDefault();
            setLanguage('en');
        });
    }
});
