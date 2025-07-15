import { neon } from '@netlify/neon';

export default async function handler(req, res) {
    // Solo permitir GET para esta función de setup
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const sql = neon(process.env.NETLIFYDATABASEURL);

        // Crear tabla para los diálogos
        await sql`
            CREATE TABLE IF NOT EXISTS cosmic_dialogues (
                id SERIAL PRIMARY KEY,
                dialogue_number INTEGER,
                theme TEXT,
                voice1_line1 TEXT,
                voice2_line1 TEXT,
                voice1_line2 TEXT,
                voice2_line2 TEXT,
                visitor_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSONB
            )
        `;

        // Crear índices para mejorar consultas
        await sql`
            CREATE INDEX IF NOT EXISTS idx_created_at ON cosmic_dialogues(created_at DESC)
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_visitor_id ON cosmic_dialogues(visitor_id)
        `;

        // Verificar que funciona
        const result = await sql`
            SELECT COUNT(*) as count FROM cosmic_dialogues
        `;

        res.status(200).json({
            success: true,
            message: 'Base de datos inicializada',
            totalDialogues: result[0].count
        });

    } catch (error) {
        console.error('Error inicializando DB:', error);
        res.status(500).json({
            error: 'Error al inicializar base de datos',
            details: error.message
        });
    }
}