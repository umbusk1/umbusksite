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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { session_id, limit = 50 } = req.query;

    let query;
    let result;

    if (session_id) {
      // Consultar por session_id específico
      result = await sql`
        SELECT * FROM conversations
        WHERE session_id = ${session_id}
        ORDER BY timestamp DESC
        LIMIT ${parseInt(limit)}
      `;
    } else {
      // Consultar todos (para admin o testing)
      result = await sql`
        SELECT * FROM conversations
        ORDER BY timestamp DESC
        LIMIT ${parseInt(limit)}
      `;
    }

    console.log(`Historial consultado: ${result.length} conversaciones encontradas`);

    res.status(200).json({
      success: true,
      conversations: result,
      count: result.length
    });

  } catch (error) {
    console.error('Error consultando historial:', error);
    res.status(500).json({
      error: 'Error al consultar historial',
      details: error.message
    });
  }
};