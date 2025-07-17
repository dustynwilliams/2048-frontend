import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseConnection } from './db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { studentId } = req.query;

  if (!studentId) {
    return res.status(400).json({ error: 'studentId is required' });
  }

  try {
    console.log('🔄 Fetching individual student progress for studentId:', studentId);
    
    const result = await DatabaseConnection.query(`
      SELECT 
        sp.id,
        sp.student_id,
        sp.lesson_id,
        sp.engagement_date,
        sp.completion_date,
        sp.total_time,
        sp.is_required,
        l.lesson_name,
        ch.chapter_name,
        co.course_name,
        col.collection_name,
        c.curriculum_name,
        ch.id as chapter_id,
        co.id as course_id,
        col.id as collection_id,
        c.id as curriculum_id,
        CASE 
          WHEN sp.completion_date IS NOT NULL THEN 'completed'
          WHEN sp.engagement_date IS NOT NULL THEN 'in_progress'
          ELSE 'not_started'
        END as completion_status
      FROM student_progress_optimized sp
      JOIN content_lessons l ON sp.lesson_id = l.id
      JOIN content_chapters ch ON l.chapter_id = ch.id
      JOIN content_courses co ON ch.course_id = co.id
      JOIN content_collections col ON co.collection_id = col.id
      JOIN content_curricula c ON col.curriculum_id = c.id
      WHERE sp.student_id = $1
      ORDER BY c.curriculum_name, col.collection_name, co.course_name, ch.chapter_name, l.lesson_name
    `, [studentId]);

    console.log('✅ Individual student progress fetched:', {
      studentId,
      lessonCount: result.rows.length
    });

    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('❌ Error fetching individual student progress:', error);
    res.status(500).json({ error: error.message });
  }
} 