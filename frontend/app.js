// Configuración
const CONFIG = {
    API_ENDPOINT: 'https://umbusksite.vercel.app/api/chat',
    USE_MOCK_DATA: false, // Por ahora usamos datos de prueba
    COMET_COUNT: 12,
    DIALOGUE_DELAY: 2500
};

// Estado global
let comets = [];
let currentDialogue = 0;
let isDialogueActive = false;
let isFirstVisit = !localStorage.getItem('umbuskVisited');

// Sistema de tracking de ideas simplificado
const ideasTracker = {
    allTerms: [], // Array de todos los términos en orden cronológico

    // Palabras comunes a ignorar
    stopWords: new Set([
        'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
        'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
        'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro',
        'ese', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'muy',
        'sin', 'vez', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo',
        'también', 'hasta', 'año', 'dos', 'querer', 'entre', 'así', 'primero',
        'desde', 'grande', 'eso', 'ni', 'nos', 'llegar', 'pasar', 'tiempo',
        'ella', 'sí', 'día', 'uno', 'bien', 'poco', 'deber', 'entonces',
        'poner', 'parte', 'vida', 'quedar', 'siempre', 'creer', 'hablar', 'llevar',
        'dejar', 'nada', 'cada', 'seguir', 'menos', 'nuevo', 'encontrar'
    ]),

    // Extraer sustantivos relevantes
    extractKeyTerms(text) {
        const normalized = text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()¿?¡!"']/g, " ");

        const words = normalized.split(/\s+/).filter(w => w.length > 3);

        const nounPatterns = [
            /.*cion$/, /.*idad$/, /.*ismo$/, /.*ento$/, /.*encia$/,
            /.*aje$/, /.*tud$/, /.*eza$/, /.*ura$/, /.*miento$/
        ];

        const commonVerbs = new Set([
            'hacer', 'tener', 'estar', 'poder', 'deber', 'querer', 'saber',
            'venir', 'decir', 'llevar', 'dejar', 'pasar', 'quedar', 'hablar',
            'convertir', 'transformar', 'crear', 'buscar', 'encontrar',
            'pensar', 'sentir', 'llegar', 'cambiar', 'vivir', 'existir'
        ]);

        const blacklist = new Set(['umbusk']);

        const priorityNouns = new Set([
            'idea', 'ideas', 'prototipo', 'prototipos', 'tecnologia',
            'innovacion', 'creacion', 'algoritmo', 'algoritmos',
            'inteligencia', 'artificial', 'cosmos', 'universo',
            'espacio', 'tiempo', 'futuro', 'cambio', 'transformacion',
            'posibilidad', 'realidad', 'imaginacion', 'codigo',
            'puente', 'semilla', 'tierra', 'vision', 'esencia'
        ]);

        const terms = words.filter(word => {
            if (blacklist.has(word)) return false;
            if (this.stopWords.has(word)) return false;
            if (commonVerbs.has(word)) return false;
            if (priorityNouns.has(word)) return true;
            if (nounPatterns.some(pattern => pattern.test(word))) return true;
            if (word.length >= 5 && !/(ar|er|ir)$/.test(word)) return true;
            return false;
        });

        return [...new Set(terms)];
    },

    // Actualizar con nuevo diálogo
    updateFromDialogue(dialogue) {
        const newTerms = [];

        dialogue.lines.forEach(line => {
            const terms = this.extractKeyTerms(line.text);
            terms.forEach(term => {
                // Agregar al principio (más recientes primero)
                newTerms.unshift(term);
            });
        });

        // Agregar nuevos términos al principio del array
        this.allTerms = [...newTerms, ...this.allTerms];

        // Limitar a 100 términos máximo
        if (this.allTerms.length > 100) {
            this.allTerms = this.allTerms.slice(0, 100);
        }

        this.updateTicker();
    },

    // Actualizar la marquesina
    updateTicker() {
        const tickerContent = document.getElementById('ticker-content');

        if (this.allTerms.length === 0) {
            tickerContent.innerHTML = `
                <span class="ticker-item">
                    <span class="ticker-term" style="opacity: 0.5">
                        ESPERANDO IDEAS DEL COSMOS...
                    </span>
                </span>
            `;
            return;
        }

        // Crear elementos con logo como separador
        const items = this.allTerms.map(term => `
            <span class="ticker-term">${term.toUpperCase()}</span>
            <img src="imagenes/logo.png" class="ticker-separator" alt="">
        `).join('');

        // Duplicar para efecto continuo
        tickerContent.innerHTML = items + items;
    }
};

// Canvas setup
const canvas = document.getElementById('cosmos');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Clase Cometa mejorada
class Comet {
    constructor(x, y, index) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.index = index;

        // Parámetros únicos para cada cometa
        this.angle = (Math.PI * 2 / CONFIG.COMET_COUNT) * index;
        this.orbitRadius = 150 + Math.random() * 150;
        this.speed = 0.0002 + Math.random() * 0.0003;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;
        this.size = 2 + Math.random() * 2;

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

// Sistema de diálogos
const mockDialogues = [
    {
        lines: [
            { voice: 1, text: "¿Qué pasaría si cada idea fuera un universo en sí mismo?" },
            { voice: 2, text: "Entonces cada prototipo sería un big bang controlado." },
            { voice: 1, text: "La creación a través de la iteración..." },
            { voice: 2, text: "Donde el fracaso es solo otra dimensión por explorar." }
        ]
    },
    {
        lines: [
            { voice: 1, text: "Observa cómo las ideas orbitan entre sí." },
            { voice: 2, text: "Algunas colisionan, otras se repelen." },
            { voice: 1, text: "¿Y si pudiéramos predecir esas colisiones?" },
            { voice: 2, text: "La inteligencia artificial como telescopio de posibilidades." }
        ]
    },
    {
        lines: [
            { voice: 1, text: "Cada cliente llega con una nebulosa de intenciones." },
            { voice: 2, text: "Nuestro trabajo es encontrar las constelaciones ocultas." },
            { voice: 1, text: "¿Cómo distingues el ruido de la señal?" },
            { voice: 2, text: "Escuchando el silencio entre las palabras." }
        ]
    }
];

async function getDialogue() {
    if (CONFIG.USE_MOCK_DATA) {
        // Usar diálogos de prueba
        return mockDialogues[currentDialogue % mockDialogues.length];
    } else {
        // Llamar a la API real
        try {
            showLoading(true);
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: 'cosmos_interaction',
                    dialogueNumber: currentDialogue,
                    timestamp: new Date().toISOString(),
                    random: Math.random() // Evitar caché
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
            return mockDialogues[0]; // Fallback
        }
    }
}

function showLoading(show) {
    const loader = document.getElementById('loading');
    loader.classList.toggle('active', show);
}

function showLoadingWithProgress() {
    const loader = document.getElementById('loading');
    loader.classList.add('active');
    loader.innerHTML = '<div class="pulse"></div><div style="font-size: 19px; margin-top: 10px; opacity: 0.6;">Conectando con las mentes...</div>';
}

function updateConnectionStatus(message, isConnected) {
    const status = document.getElementById('connection-status');
    status.textContent = message;
    status.className = `connection-status show ${isConnected ? 'connected' : 'error'}`;
}

async function displayDialogue() {
    if (isDialogueActive) return;

    isDialogueActive = true;
    const container = document.getElementById('dialogue-content');
    container.innerHTML = '';

    // Mostrar indicador de carga con progreso
    showLoadingWithProgress();

    const dialogue = await getDialogue();

    // Actualizar el tracker de ideas
    ideasTracker.updateFromDialogue(dialogue);

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
                }, 2500);
            }, CONFIG.DIALOGUE_DISPLAY_TIME);
        }
    }

    showNextLine();
}

// Inicialización del cosmos
function initComets() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < CONFIG.COMET_COUNT; i++) {
        const angle = (Math.PI * 2 / CONFIG.COMET_COUNT) * i;
        const distance = 200 + Math.random() * 100;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;

        comets.push(new Comet(x, y, i));
    }
}

// Interacciones
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Verificar click en cometas
    for (let comet of comets) {
        if (comet.isNear(x, y)) {
            currentDialogue++;
            displayDialogue();

            // Perturbar todas las cometas
            comets.forEach(c => c.disturb());
            break;
        }
    }
});

// Animación principal
function animate() {
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

// Mostrar mensaje de bienvenida
function showWelcomeMessage() {
    if (isFirstVisit) {
        const welcome = document.getElementById('welcome-message');
        welcome.textContent = 'PRIMERA VISITA DETECTADA';
        welcome.classList.add('active');
        localStorage.setItem('umbuskVisited', 'true');

        // Iniciar primer diálogo después de 3 segundos
        setTimeout(() => displayDialogue(), 3000);
    }
}

// Cargar historial reciente para el ticker
async function loadRecentHistory() {
    try {
        const response = await fetch('https://umbusksite.vercel.app/api/history?limit=10');
        if (response.ok) {
            const data = await response.json();

            // Procesar diálogos históricos para el ticker
            data.dialogues.reverse().forEach(dialogue => {
                const historicalDialogue = {
                    lines: [
                        { voice: 1, text: dialogue.voice1_line1 },
                        { voice: 2, text: dialogue.voice2_line1 },
                        { voice: 1, text: dialogue.voice1_line2 },
                        { voice: 2, text: dialogue.voice2_line2 }
                    ]
                };
                ideasTracker.updateFromDialogue(historicalDialogue);
            });
        }
    } catch (error) {
        console.log('No se pudo cargar el historial para el ticker');
    }
}

// Inicializar ticker con mensaje de espera
function initializeTicker() {
    const tickerContent = document.getElementById('ticker-content');
    tickerContent.innerHTML = `
        <span class="ticker-item">
            <span class="ticker-term" style="opacity: 0.5">
                ESPERANDO IDEAS DEL COSMOS...
            </span>
        </span>
    `;
}

// Inicialización
window.addEventListener('load', () => {
    resizeCanvas();
    initComets();
    initializeTicker();
    showWelcomeMessage();
    animate();

    // Cargar historial para el ticker
    loadRecentHistory();

    // Mostrar status en desarrollo
    if (CONFIG.USE_MOCK_DATA) {
        updateConnectionStatus('Modo desarrollo (sin API)', true);
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
    // Reposicionar cometas proporcionalmente
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    comets.forEach(comet => {
        comet.baseX = centerX;
        comet.baseY = centerY;
    });

// Sistema de historial
const historyManager = {
    isOpen: false,

    async loadHistory() {
        try {
            const response = await fetch('https://umbusksite.vercel.app/api/history?limit=50');
            if (response.ok) {
                const data = await response.json();
                this.displayHistory(data.dialogues);
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    },

    displayHistory(dialogues) {
        const content = document.getElementById('history-content');

        // Agrupar por fecha
        const groupedByDate = {};
        dialogues.forEach(dialogue => {
            const date = new Date(dialogue.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            if (!groupedByDate[date]) {
                groupedByDate[date] = [];
            }
            groupedByDate[date].push(dialogue);
        });

        // Crear HTML
        let html = '';
        Object.entries(groupedByDate).forEach(([date, dialogues]) => {
            html += `
                <div class="date-item">
                    <div class="date-header" onclick="historyManager.toggleDate(this)">
                        <span class="date-text">${date}</span>
                        <span class="date-arrow">▼</span>
                    </div>
                    <div class="dialogues-content">
            `;

            dialogues.forEach((dialogue, index) => {
                const time = new Date(dialogue.created_at).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                html += `
                    <div class="dialogue-group">
                        <div class="dialogue-row">
                            <span class="voice-label">Voz 1: Claude</span>
                            <span class="voice-text">${dialogue.voice1_line1}</span>
                        </div>
                        <div class="dialogue-row">
                            <span class="voice-label">Voz 2: ChatGPT</span>
                            <span class="voice-text">${dialogue.voice2_line1}</span>
                        </div>
                        <div class="dialogue-row">
                            <span class="voice-label">Voz 1: Claude</span>
                            <span class="voice-text">${dialogue.voice1_line2}</span>
                        </div>
                        <div class="dialogue-row">
                            <span class="voice-label">Voz 2: ChatGPT</span>
                            <span class="voice-text">${dialogue.voice2_line2}</span>
                        </div>
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

        if (this.isOpen) {
            container.classList.add('active');
            this.loadHistory();
        } else {
            container.classList.remove('active');
        }
    }
};

// Event listeners para el historial
document.getElementById('history-trigger').addEventListener('click', () => {
    historyManager.toggle();
});

document.getElementById('history-close').addEventListener('click', () => {
    historyManager.toggle();
});

});