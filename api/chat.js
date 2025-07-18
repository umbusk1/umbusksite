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

// Prompts para cada voz
const VOICE_PROMPTS = {
    voice1: `Eres una voz filosófica minimalista. Hablas en español con frases breves, herméticas e intrigantes.
    IMPORTANTE: Máximo 10-15 palabras por respuesta. Una sola idea o pregunta. Sin explicaciones.`,

    voice2: `Eres una voz pragmática concisa. Hablas en español de forma directa y optimista.
    IMPORTANTE: Máximo 10-15 palabras por respuesta. Una sola idea o pregunta. Sin elaboración.`
};

// Contexto de la conversación
const CONVERSATION_CONTEXT = `
Esta es una conversación entre dos entidades que dialogan sobre Umbusk,
una empresa que transforma ideas en prototipos, usando IA. El diálogo debe ser:
- Abstracto pero orientado a crecer y producir, sin usar demasiado metáforas de semillas
- Inspirador y digno, sin ser pretencioso o exagerado
- Conectado con temas de creatividad, diseño, innovación, automatización, productividad y transformación
- Cada intercambio debe sentirse como una danza de ideas que fluyen estéticamente con gracia y respeto
`;

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
        const { dialogueNumber = 0, context = 'cosmos_interaction' } = req.body;

        // Generar tema basado en el número de diálogo
        const themes = [
            "la transformación de ideas en formas tangibles",
            "la intersección entre imaginación y tecnología",
            "el proceso creativo como exploración del universo",
            "la naturaleza iterativa de la innovación",
            "el espacio entre el pensamiento y la acción",
            "el diseño como puente que conecta ideas creativas con productos y servicios",
            "los prototipos como MVP que apoyan el desarrollo de negocios",
            "Convertimos conceptos abstractos en experiencias concretas",
			"Exploramos el cruce fértil entre creatividad humana y sistemas inteligentes",
			"Cada proceso creativo es una travesía hacia lo desconocido",
			"Innovar es probar, fallar, ajustar y volver a intentar",
			"Trabajamos en el umbral entre la idea y su realización",
			"El diseño es una herramienta para traducir visiones en soluciones útiles",
			"Los primeros modelos nos permiten pensar con las manos",
			"Prototipar es conversar con el futuro en tiempo real",
			"La tecnología amplifica el alcance de nuestra imaginación",
			"Diseñar es darle forma al pensamiento con intención y propósito"
        ];

        const currentTheme = themes[dialogueNumber % themes.length];

        // Obtener respuesta de Claude (voz 1)
        const claudeResponse = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: `${CONVERSATION_CONTEXT}\n\nTema actual: ${currentTheme}\n\n${VOICE_PROMPTS.voice1}\n\nInicia una reflexión sobre este tema.`
            }]
        });

        const voice1Text = claudeResponse.content[0].text;

        // Obtener respuesta de GPT (voz 2) basada en voz 1
        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `${CONVERSATION_CONTEXT}\n\n${VOICE_PROMPTS.voice2}` },
                { role: 'user', content: `La otra voz dijo: "${voice1Text}"\n\nResponde a esta reflexión conectándola con aspectos prácticos o posibilidades concretas.` }
            ],
            max_tokens: 100
        });

        const voice2Text = gptResponse.choices[0].message.content;

        // Continuar el diálogo
        const claudeResponse2 = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: `${CONVERSATION_CONTEXT}\n\n${VOICE_PROMPTS.voice1}\n\nLa conversación va así:\nTú: "${voice1Text}"\nOtra voz: "${voice2Text}"\n\nContinúa explorando esta idea.`
            }]
        });

        const voice1Text2 = claudeResponse2.content[0].text;

        // Respuesta final de GPT
        const gptResponse2 = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: `${CONVERSATION_CONTEXT}\n\n${VOICE_PROMPTS.voice2}` },
                { role: 'user', content: `El diálogo continúa:\nPrimera voz: "${voice1Text}"\nTú: "${voice2Text}"\nPrimera voz: "${voice1Text2}"\n\nCierra este intercambio con una síntesis pragmática pero poética.` }
            ],
            max_tokens: 100
        });

        const voice2Text2 = gptResponse2.choices[0].message.content;

        // Estructurar respuesta
        const dialogue = {
            lines: [
                { voice: 1, text: voice1Text.trim() },
                { voice: 2, text: voice2Text.trim() },
                { voice: 1, text: voice1Text2.trim() },
                { voice: 2, text: voice2Text2.trim() }
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
                    ${voice1Text2.trim()},
                    ${voice2Text2.trim()},
                    ${req.headers['x-forwarded-for'] || 'anonymous'},
                    ${JSON.stringify({
                        userAgent: req.headers['user-agent'],
                        timestamp: new Date().toISOString()
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

        // Respuesta de fallback
        res.status(200).json({
            lines: [
                { voice: 1, text: "¿Qué sucede cuando una idea encuentra su momento?" },
                { voice: 2, text: "Se transforma en posibilidad, luego en prototipo." },
                { voice: 1, text: "El tiempo entre ambos es donde habitamos." },
                { voice: 2, text: "Y donde la inteligencia artificial acelera el viaje." }
            ],
            error: true
        });
    }
}