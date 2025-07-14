// Configuración
const CONFIG = {
    API_ENDPOINT: '/api/chat', // Cambiaremos esto cuando tengamos Vercel
    USE_MOCK_DATA: true, // Por ahora usamos datos de prueba
    COMET_COUNT: 12,
    DIALOGUE_DELAY: 2500
};

// Estado global
let comets = [];
let currentDialogue = 0;
let isDialogueActive = false;
let isFirstVisit = !localStorage.getItem('umbuskVisited');

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
    loader.innerHTML = '<div class="pulse"></div><div style="font-size: 11px; margin-top: 10px; opacity: 0.6;">Conectando con las mentes...</div>';
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

// Inicialización
window.addEventListener('load', () => {
    resizeCanvas();
    initComets();
    showWelcomeMessage();
    animate();

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
});