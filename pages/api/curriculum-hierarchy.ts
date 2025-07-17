import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseConnection } from './db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await DatabaseConnection.query(`
      SELECT DISTINCT
        c.id as curriculum_id,
        c.curriculum_name,
        col.id as collection_id,
        col.collection_name,
        co.id as course_id,
        co.course_name,
        ch.id as chapter_id,
        ch.chapter_name
      FROM content_curricula c
      LEFT JOIN content_collections col ON col.curriculum_id = c.id
      LEFT JOIN content_courses co ON co.collection_id = col.id
      LEFT JOIN content_chapters ch ON ch.course_id = co.id
      ORDER BY c.curriculum_name, col.collection_name, co.course_name, ch.chapter_name
    `);

    console.log('📊 Curriculum hierarchy API response:', {
      rowCount: result.rows.length,
      sampleRow: result.rows[0]
    });

    // Return the flat structure directly - no transformation needed
    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('Error fetching curriculum hierarchy:', error);
    res.status(500).json({ error: error.message });
  }
} 