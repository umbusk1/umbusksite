import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const sql = neon(process.env.DATABASEURL);

        // Obtener parámetros de consulta
        const limit = parseInt(req.query?.limit) || 50;
        const offset = parseInt(req.query?.offset) || 0;

        // Obtener diálogos recientes
        const dialogues = await sql`
            SELECT
                id,
                dialogue_number,
                theme,
                voice1_line1,
                voice2_line1,
                voice1_line2,
                voice2_line2,
                created_at,
                visitor_id
            FROM cosmic_dialogues
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
        `;

        // Obtener estadísticas
        const stats = await sql`
            SELECT
                COUNT(*) as total_dialogues,
                COUNT(DISTINCT visitor_id) as unique_visitors,
                COUNT(DISTINCT theme) as unique_themes
            FROM cosmic_dialogues
        `;

        // Temas más explorados
        const topThemes = await sql`
            SELECT
                theme,
                COUNT(*) as count
            FROM cosmic_dialogues
            GROUP BY theme
            ORDER BY count DESC
            LIMIT 5
        `;

        res.status(200).json({
            dialogues,
            stats: stats[0],
            topThemes,
            pagination: {
                limit,
                offset,
                hasMore: dialogues.length === limit
            }
        });

    } catch (error) {
        console.error('Error consultando historial:', error);
        res.status(500).json({
            error: 'Error al consultar historial',
            details: error.message
        });
    }
}