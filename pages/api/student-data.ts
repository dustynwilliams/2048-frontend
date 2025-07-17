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
    console.log('🚀 Fetching individual student data for studentId:', studentId);

    // Use denormalized student_progress table for individual student data
    // This avoids complex JOINs and is faster for individual student queries
    const result = await DatabaseConnection.query(`
      SELECT 
        lesson_id,
        lesson_name,
        is_required,
        chapter_id,
        chapter_name,
        course_id,
        course_name,
        collection_id,
        collection_name,
        curriculum_id,
        curriculum_name,
        student_id,
        student_email,
        student_first,
        student_last,
        school_id,
        school_name,
        engagement_date,
        completion_date,
        total_time
      FROM student_progress
      WHERE student_id = $1
      ORDER BY curriculum_name, collection_name, course_name, chapter_name, lesson_name
    `, [studentId]);

    console.log('✅ Individual student data fetched successfully:', {
      studentId,
      lessonCount: result.rows.length
    });

    res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('❌ Error fetching individual student data:', error);
    res.status(500).json({ error: error.message });
  }
} 