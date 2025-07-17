import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseConnection } from './db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { schoolId } = req.query;

  if (!schoolId) {
    return res.status(400).json({ error: 'schoolId is required' });
  }

  try {
    const result = await DatabaseConnection.query(`
      SELECT id, student_email, student_first, student_last, school_id
      FROM entities_students 
      WHERE school_id = $1
      ORDER BY student_last, student_first
    `, [schoolId]);

    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
} 