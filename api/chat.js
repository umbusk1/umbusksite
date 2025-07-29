// Función serverless para manejar los diálogos
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { neon } from '@neondatabase/serverless';

// Inicializar clientes (las keys vienen de las variables de entorno)
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPICAPIKEY
});

const openai = new OpenAI({
    apiKey: process.env.OPENAIAPIKEY
});

// Prompts para cada voz en ambos idiomas
const VOICE_PROMPTS = {
    es: {
        voice1: `Eres una voz filosófica minimalista. Hablas en español con frases breves, herméticas e intrigantes.
        IMPORTANTE: Máximo 10-15 palabras por respuesta. Una sola idea o pregunta. Sin explicaciones.`,
        voice2: `Eres una voz pragmática concisa. Hablas en español de forma directa y optimista.
        IMPORTANTE: Máximo 10-15 palabras por respuesta. Una sola idea o pregunta. Sin elaboración.`
    },
    en: {
        voice1: `You are a minimalist philosophical voice. Speak in English with brief, hermetic, intriguing phrases.
        IMPORTANT: Maximum 10-15 words per response. Single idea or question. No explanations.`,
        voice2: `You are a concise pragmatic voice. Speak in English directly and optimistically.
        IMPORTANT: Maximum 10-15 words per response. Single idea or question. No elaboration.`
    }
};

// Contexto de la conversación en ambos idiomas
const CONVERSATION_CONTEXT = {
    es: `Esta es una conversación entre dos entidades que dialogan sobre Umbusk,
una empresa que transforma ideas en prototipos, usando IA. El diálogo debe ser:
- Abstracto pero orientado a crecer y producir, sin usar demasiado metáforas de semillas
- Inspirador y digno, sin ser pretencioso o exagerado
- Conectado con temas de creatividad, diseño, innovación, automatización, productividad y transformación
- Cada intercambio debe sentirse como una danza de ideas que fluyen estéticamente con gracia y respeto`,

    en: `This is a conversation between two entities discussing Umbusk,
a company that transforms ideas into prototypes using AI. The dialogue should be:
- Abstract but oriented towards growth and production, without overusing seed metaphors
- Inspiring and dignified, without being pretentious or exaggerated
- Connected to themes of creativity, design, innovation, automation, productivity and transformation
- Each exchange should feel like a dance of ideas flowing aesthetically with grace and respect`
};

export default async function handler(req, res) {
    // Configurar CORS para permitir peticiones desde Netlify
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { dialogueNumber = 0, context = 'cosmos_interaction', language = 'es' } = req.body;

        // Generar tema basado en el número de diálogo - ahora bilingüe
        const themes = {
            es: [
                "la transformación de ideas en formas tangibles",
                "la intersección entre imaginación y tecnología",
                "el proceso creativo como exploración del universo",
                "la naturaleza iterativa de la innovación",
                "el espacio entre el pensamiento y la acción",
                "el diseño como puente que conecta ideas creativas con productos y servicios",
                "los prototipos como MVP que apoyan el desarrollo de negocios",
                "convertimos conceptos abstractos en artefactos capaces de producir experiencias concretas",
                "exploramos el cruce fértil entre creatividad humana y sistemas inteligentes",
                "cada proceso creativo es una travesía hacia lo desconocido",
                "innovar es probar, fallar, ajustar y volver a intentar",
                "trabajamos en el umbral entre la idea y su realización",
                "el diseño es una herramienta para traducir visiones en soluciones útiles",
                "los primeros modelos nos permiten pensar con las manos",
                "prototipar es conversar con el futuro en tiempo real",
                "la tecnología amplifica el alcance de nuestra imaginación",
                "diseñar es darle forma al pensamiento con intención y propósito"
            ],
            en: [
                "transforming ideas into tangible forms",
                "the intersection of imagination and technology",
                "the creative process as universe exploration",
                "the iterative nature of innovation",
                "the space between thought and action",
                "design as a bridge connecting creative ideas with products and services",
                "prototypes as MVPs that support business development",
                "we convert abstract concepts into artifacts capable of producing concrete experiences",
                "we explore the fertile crossing between human creativity and intelligent systems",
                "each creative process is a journey into the unknown",
                "innovating is testing, failing, adjusting and trying again",
                "we work at the threshold between idea and realization",
                "design is a tool to translate visions into useful solutions",
                "first models allow us to think with our hands",
                "prototyping is conversing with the future in real time",
                "technology amplifies the reach of our imagination",
                "designing is shaping thought with intention and purpose"
            ]
        };

        const currentTheme = themes[language][dialogueNumber % themes[language].length];

        // Obtener respuesta de Claude (voz 1)
        const claudePrompt = language === 'es'
            ? `${CONVERSATION_CONTEXT[language]}\n\nTema actual: ${currentTheme}\n\n${VOICE_PROMPTS[language].voice1}\n\nInicia una reflexión sobre este tema.`
            : `${CONVERSATION_CONTEXT[language]}\n\nCurrent theme: ${currentTheme}\n\n${VOICE_PROMPTS[language].voice1}\n\nBegin a reflection on this theme.`;

        const claudeResponse = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: claudePrompt
            }]
        });

        const voice1Text = claudeResponse.content[0].text;

        // Obtener respuesta de GPT (voz 2) basada en voz 1
        const gptUserPrompt = language === 'es'
            ? `La otra voz dijo: "${voice1Text}"\n\nResponde a esta reflexión conectándola con aspectos prácticos o posibilidades concretas.`
            : `The other voice said: "${voice1Text}"\n\nRespond to this reflection connecting it with practical aspects or concrete possibilities.`;

        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `${CONVERSATION_CONTEXT[language]}\n\n${VOICE_PROMPTS[language].voice2}` },
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
            theme: currentTheme,
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
                    ${currentTheme},
                    ${voice1Text.trim()},
                    ${voice2Text.trim()},
                    NULL,
                    NULL,
                    ${req.headers['x-forwarded-for'] || 'anonymous'},
                    ${JSON.stringify({
                        userAgent: req.headers['user-agent'],
                        timestamp: new Date().toISOString(),
                        language: language
                    })}
                )
            `;
            console.log('Diálogo guardado en DB');
        } catch (dbError) {
            console.error('Error guardando en DB:', dbError);
            // No fallar si la DB tiene problemas
        }

        res.status(200).json(dialogue);

    } catch (error) {
        console.error('Error en la API:', error);

        // Respuesta de fallback bilingüe
        const fallbackDialogues = {
            es: {
                lines: [
                    { voice: 1, text: "¿Qué sucede cuando una idea encuentra su momento?" },
                    { voice: 2, text: "Se transforma en posibilidad tangible." }
                ],
                error: true
            },
            en: {
                lines: [
                    { voice: 1, text: "What happens when an idea finds its moment?" },
                    { voice: 2, text: "It transforms into tangible possibility." }
                ],
                error: true
            }
        };

        const language = req.body.language || 'es';
        res.status(200).json(fallbackDialogues[language]);
    }
}