import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const sql = neon(process.env.NETLIFYDATABASEURL || process.env.DATABASE_URL);
    
    try {
        // GET: Ver últimos registros
        if (req.method === 'GET') {
            const limit = parseInt(req.query?.limit) || 10;
            
            const dialogues = await sql`
                SELECT 
                    id,
                    dialogue_number,
                    theme,
                    voice1_line1,
                    voice2_line1,
                    created_at
                FROM cosmic_dialogues
                ORDER BY created_at DESC
                LIMIT ${limit}
            `;
            
            return res.status(200).json({
                success: true,
                count: dialogues.length,
                dialogues
            });
        }
        
        // DELETE: Limpiar la base de datos
        if (req.method === 'DELETE') {
            const action = req.query?.action;
            
            if (action === 'all') {
                // Eliminar todos los registros
                const result = await sql`
                    DELETE FROM cosmic_dialogues
                    RETURNING id
                `;
                
                return res.status(200).json({
                    success: true,
                    message: 'Base de datos limpiada',
                    deletedCount: result.length
                });
            } else if (action === 'old') {
                // Eliminar registros de más de 7 días
                const result = await sql`
                    DELETE FROM cosmic_dialogues
                    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
                    RETURNING id
                `;
                
                return res.status(200).json({
                    success: true,
                    message: 'Registros antiguos eliminados',
                    deletedCount: result.length
                });
            } else if (req.query?.id) {
                // Eliminar un registro específico
                const id = parseInt(req.query.id);
                const result = await sql`
                    DELETE FROM cosmic_dialogues
                    WHERE id = ${id}
                    RETURNING id
                `;
                
                return res.status(200).json({
                    success: true,
                    message: 'Registro eliminado',
                    deleted: result.length > 0
                });
            }
            
            return res.status(400).json({
                error: 'Especifica action=all, action=old, o id=X'
            });
        }
        
        return res.status(405).json({ error: 'Método no permitido' });
        
    } catch (error) {
        console.error('Error gestionando DB:', error);
        res.status(500).json({ 
            error: 'Error al gestionar base de datos',
            details: error.message 
        });
    }
}