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
      SELECT 
        s.id,
        s.student_email,
        s.student_first,
        s.student_last,
        s.school_id,
        sch.school_name
      FROM entities_students s
      JOIN entities_schools sch ON s.school_id = sch.id
      JOIN entities_cohorts c ON s.cohort_id = c.id
      WHERE s.school_id = $1 
        AND c.cohort_name = 'Faculty'
      ORDER BY s.student_last, s.student_first
    `, [schoolId]);

    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching faculty members:', error);
    res.status(500).json({ error: error.message });
  }
} 