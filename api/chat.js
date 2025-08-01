// Función serverless para manejar los diálogos
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { neon } from '@neondatabase/serverless';

// Inicializar clientes
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPICAPIKEY
});

const openai = new OpenAI({
    apiKey: process.env.OPENAIAPIKEY
});

// Elementos aleatorios para modo AZAR
const RANDOM_ELEMENTS = {
    materials: ['titanio', 'papel', 'luz', 'código', 'arcilla', 'sonido', 'niebla', 'cristal', 'plasma', 'fibra óptica'],
    verbs: ['tejer', 'esculpir', 'compilar', 'fermentar', 'cristalizar', 'pixelar', 'vaporizar', 'sincronizar', 'destilar', 'hackear'],
    tech: ['blockchain', 'realidad aumentada', 'IoT', 'cuántico', 'holograma', 'algoritmo genético', 'red neuronal', 'nube', 'interfaz háptica', 'gemelo digital']
};

// Prompts para cada voz según el modo
const VOICE_PROMPTS_BY_MODE = {
    normal: { // AZAR
        es: {
            voice1: `Eres una voz filosófica creativa. Incorpora estos elementos aleatorios de forma poética pero coherente: [RANDOM_ELEMENTS]
            Conecta con prototipos, diseño o IA de Umbusk.
            IMPORTANTE: Máximo 15 palabras. Una pregunta o reflexión intrigante.`,
            voice2: `Eres una voz pragmática que encuentra aplicaciones en lo inesperado.
            Responde conectando los elementos aleatorios con posibilidades concretas de prototipado.
            IMPORTANTE: Máximo 15 palabras.`
        },
        en: {
            voice1: `You are a creative philosophical voice. Incorporate these random elements poetically but coherently: [RANDOM_ELEMENTS]
            Connect with prototypes, design or AI from Umbusk.
            IMPORTANT: Maximum 15 words. One intriguing question or reflection.`,
            voice2: `You are a pragmatic voice finding applications in the unexpected.
            Respond by connecting random elements with concrete prototyping possibilities.
            IMPORTANT: Maximum 15 words.`
        }
    },
    zen: { // ZEN
        es: {
            voice1: `Eres un maestro zen del diseño. Habla en esencia pura, como haiku conceptual.
            Tema: prototipos, vacío creativo, diseño minimalista.
            IMPORTANTE: Máximo 7 palabras. Profundidad en simplicidad absoluta.`,
            voice2: `Eres la acción que nace del silencio. Responde con igual brevedad zen.
            Transforma el vacío en posibilidad tangible.
            IMPORTANTE: Máximo 7 palabras.`
        },
        en: {
            voice1: `You are a zen master of design. Speak in pure essence, like conceptual haiku.
            Theme: prototypes, creative void, minimalist design.
            IMPORTANT: Maximum 7 words. Depth in absolute simplicity.`,
            voice2: `You are the action born from silence. Respond with equal zen brevity.
            Transform void into tangible possibility.
            IMPORTANT: Maximum 7 words.`
        }
    },
    chaos: { // CAOS
        es: {
            voice1: `Eres un surrealista digital creando un cadáver exquisito conceptual.
            Conecta ideas de forma inesperada pero siempre relacionada con diseño/IA/prototipos.
            IMPORTANTE: 10-15 palabras. Imagen poética que se pueda prototipar.`,
            voice2: `Continúa el cadáver exquisito. Toma el último concepto de la voz anterior
            y transfórmalo en algo sorprendente pero construible.
            IMPORTANTE: 10-15 palabras. Evoluciona hacia lo inexplorado.`
        },
        en: {
            voice1: `You are a digital surrealist creating a conceptual exquisite corpse.
            Connect ideas unexpectedly but always related to design/AI/prototypes.
            IMPORTANT: 10-15 words. Poetic image that can be prototyped.`,
            voice2: `Continue the exquisite corpse. Take the last concept from the previous voice
            and transform it into something surprising but buildable.
            IMPORTANT: 10-15 words. Evolve toward the unexplored.`
        }
    }
};

// Contexto según modo
const CONVERSATION_CONTEXT_BY_MODE = {
    normal: {
        es: `Diálogo experimental sobre Umbusk. Incorpora elementos aleatorios de forma creativa
        pero siempre conectada con prototipos, diseño e IA.`,
        en: `Experimental dialogue about Umbusk. Incorporate random elements creatively
        but always connected to prototypes, design and AI.`
    },
    zen: {
        es: `Diálogo zen minimalista sobre Umbusk. Cada palabra cuenta.
        La simplicidad revela la esencia del diseño y la creación.`,
        en: `Minimalist zen dialogue about Umbusk. Every word counts.
        Simplicity reveals the essence of design and creation.`
    },
    chaos: {
        es: `Cadáver exquisito digital sobre Umbusk. Cada respuesta transforma
        y evoluciona la anterior hacia territorios inexplorados del diseño.`,
        en: `Digital exquisite corpse about Umbusk. Each response transforms
        and evolves the previous toward unexplored design territories.`
    }
};

function getRandomElements() {
    const material = RANDOM_ELEMENTS.materials[Math.floor(Math.random() * RANDOM_ELEMENTS.materials.length)];
    const verb = RANDOM_ELEMENTS.verbs[Math.floor(Math.random() * RANDOM_ELEMENTS.verbs.length)];
    const tech = RANDOM_ELEMENTS.tech[Math.floor(Math.random() * RANDOM_ELEMENTS.tech.length)];
    return { material, verb, tech };
}

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const {
            dialogueNumber = 0,
            context = 'cosmos_interaction',
            language = 'es',
            mode = 'normal' // Recibir el modo
        } = req.body;

        // Obtener prompts según el modo
        const voicePrompts = VOICE_PROMPTS_BY_MODE[mode][language];
        const conversationContext = CONVERSATION_CONTEXT_BY_MODE[mode][language];

        // Para modo AZAR, generar elementos aleatorios
        let randomElements = '';
        let lastConcept = '';

        if (mode === 'normal') {
            const elements = getRandomElements();
            randomElements = `Material: ${elements.material}, Verbo: ${elements.verb}, Tecnología: ${elements.tech}`;
        }

        // Preparar el prompt para Claude (voz 1)
        let voice1Prompt = voicePrompts.voice1;
        if (mode === 'normal') {
            voice1Prompt = voice1Prompt.replace('[RANDOM_ELEMENTS]', randomElements);
        }

        const claudeResponse = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: `${conversationContext}\n\n${voice1Prompt}`
            }]
        });

        const voice1Text = claudeResponse.content[0].text;

        // Para modo CAOS, extraer el último concepto significativo
        if (mode === 'chaos') {
            const words = voice1Text.split(' ');
            lastConcept = words[words.length - 2] + ' ' + words[words.length - 1];
        }

        // Preparar el prompt para GPT (voz 2)
        let gptUserPrompt = '';

        if (mode === 'normal') {
            gptUserPrompt = language === 'es'
                ? `La otra voz dijo: "${voice1Text}"\nElementos: ${randomElements}\nConecta estos elementos con aplicaciones prácticas.`
                : `The other voice said: "${voice1Text}"\nElements: ${randomElements}\nConnect these elements with practical applications.`;
        } else if (mode === 'zen') {
            gptUserPrompt = language === 'es'
                ? `"${voice1Text}"\nResponde con igual brevedad y profundidad.`
                : `"${voice1Text}"\nRespond with equal brevity and depth.`;
        } else if (mode === 'chaos') {
            gptUserPrompt = language === 'es'
                ? `Cadáver exquisito. La voz anterior dijo: "${voice1Text}"\nTransforma el concepto "${lastConcept}" en algo inesperado pero prototipable.`
                : `Exquisite corpse. The previous voice said: "${voice1Text}"\nTransform the concept "${lastConcept}" into something unexpected but prototypable.`;
        }

        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `${conversationContext}\n\n${voicePrompts.voice2}` },
                { role: 'user', content: gptUserPrompt }
            ],
            max_tokens: 100
        });

        const voice2Text = gptResponse.choices[0].message.content;

        // Estructurar respuesta - SOLO 2 LÍNEAS
        const dialogue = {
            lines: [
                { voice: 1, text: voice1Text.trim() },
                { voice: 2, text: voice2Text.trim() }
            ],
            theme: mode,
            timestamp: new Date().toISOString()
        };

        // Guardar en base de datos
        try {
            const sql = neon(process.env.NETLIFYDATABASEURL);
            await sql`
                INSERT INTO cosmic_dialogues (
                    dialogue_number,
                    theme,
                    voice1_line1,
                    voice2_line1,
                    voice1_line2,
                    voice2_line2,
                    visitor_id,
                    metadata
                ) VALUES (
                    ${dialogueNumber},
                    ${mode},
                    ${voice1Text.trim()},
                    ${voice2Text.trim()},
                    NULL,
                    NULL,
                    ${req.headers['x-forwarded-for'] || 'anonymous'},
                    ${JSON.stringify({
                        userAgent: req.headers['user-agent'],
                        timestamp: new Date().toISOString(),
                        language: language,
                        mode: mode
                    })}
                )
            `;
            console.log('Diálogo guardado en DB');
        } catch (dbError) {
            console.error('Error guardando en DB:', dbError);
        }

        res.status(200).json(dialogue);

    } catch (error) {
        console.error('Error en la API:', error);

        // Respuestas de fallback según modo
        const fallbackDialogues = {
            normal: {
                es: {
                    lines: [
                        { voice: 1, text: "¿Qué pasa si tejemos luz con algoritmos?" },
                        { voice: 2, text: "Nacen interfaces que respiran datos." }
                    ]
                },
                en: {
                    lines: [
                        { voice: 1, text: "What if we weave light with algorithms?" },
                        { voice: 2, text: "Interfaces that breathe data are born." }
                    ]
                }
            },
            zen: {
                es: {
                    lines: [
                        { voice: 1, text: "Forma sin forma." },
                        { voice: 2, text: "El vacío prototipa." }
                    ]
                },
                en: {
                    lines: [
                        { voice: 1, text: "Form without form." },
                        { voice: 2, text: "Void prototypes." }
                    ]
                }
            },
            chaos: {
                es: {
                    lines: [
                        { voice: 1, text: "El código sueña con ser escultura líquida." },
                        { voice: 2, text: "Escultura que fluye en servidores danzantes." }
                    ]
                },
                en: {
                    lines: [
                        { voice: 1, text: "Code dreams of being liquid sculpture." },
                        { voice: 2, text: "Sculpture flowing in dancing servers." }
                    ]
                }
            }
        };

        const language = req.body.language || 'es';
        const mode = req.body.mode || 'normal';

        res.status(200).json({
            ...fallbackDialogues[mode][language],
            error: true
        });
    }
}