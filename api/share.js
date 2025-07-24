const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

  // GET: Obtener diálogo compartido
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
      }

      const result = await sql`
        SELECT generated_text, prompt_type, timestamp 
        FROM conversations 
        WHERE share_id = ${id} AND shared = true
        LIMIT 1
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Diálogo no encontrado' });
      }

      res.status(200).json({
        success: true,
        dialog: result[0]
      });

    } catch (error) {
      console.error('Error obteniendo diálogo compartido:', error);
      res.status(500).json({ error: 'Error al obtener el diálogo' });
    }
  }
  
  // POST: Crear enlace compartido
  else if (req.method === 'POST') {
    try {
      const { conversation_id } = req.body;
      
      if (!conversation_id) {
        return res.status(400).json({ error: 'ID de conversación requerido' });
      }

      // Generar ID único para compartir
      const share_id = 'share_' + Math.random().toString(36).substr(2, 9);

      // Actualizar conversación para marcarla como compartida
      const result = await sql`
        UPDATE conversations 
        SET shared = true, share_id = ${share_id}
        WHERE id = ${conversation_id}
        RETURNING share_id
      `;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Conversación no encontrada' });
      }

      res.status(200).json({
        success: true,
        share_id: result[0].share_id,
        share_url: `https://lab.umbusk.com/share?id=${result[0].share_id}`
      });

    } catch (error) {
      console.error('Error creando enlace compartido:', error);
      res.status(500).json({ error: 'Error al crear el enlace' });
    }
  }
  
  else {
    res.status(405).json({ error: 'Método no permitido' });
  }
};