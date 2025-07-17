import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseConnection } from './db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await DatabaseConnection.query(`
      SELECT id, school_name 
      FROM entities_schools 
      ORDER BY school_name
    `);

    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: error.message });
  }
} 