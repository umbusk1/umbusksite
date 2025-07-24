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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { session_id, prompt_type, generated_text } = req.body;

    if (!session_id || !generated_text) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos',
        received: { session_id: !!session_id, generated_text: !!generated_text }
      });
    }

    // Insertar conversación
    const result = await sql`
      INSERT INTO conversations (session_id, prompt_type, generated_text)
      VALUES (${session_id}, ${prompt_type || 'default'}, ${generated_text})
      RETURNING id, timestamp
    `;

    console.log('Conversación guardada:', result[0]);
    
    res.status(200).json({ 
      success: true, 
      id: result[0].id,
      timestamp: result[0].timestamp
    });

  } catch (error) {
    console.error('Error guardando conversación:', error);
    res.status(500).json({ 
      error: 'Error al guardar la conversación',
      details: error.message 
    });
  }
};