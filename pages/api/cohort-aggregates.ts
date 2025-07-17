import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseConnection } from './db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cohortId } = req.query;

  if (!cohortId) {
    return res.status(400).json({ error: 'cohortId is required' });
  }

  try {
    const [
      cohortAggregate,
      curriculumAggregate,
      collectionAggregate,
      courseAggregate,
      chapterAggregate,
      studentAggregate,
    ] = await Promise.all([
      // Cohort unfiltered aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_unfiltered_aggregates 
        WHERE cohort_id = $1
      `, [cohortId]),

      // Cohort curriculum aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_curriculum_aggregates 
        WHERE cohort_id = $1
      `, [cohortId]),

      // Cohort collection aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_collection_aggregates 
        WHERE cohort_id = $1
      `, [cohortId]),

      // Cohort course aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_course_aggregates 
        WHERE cohort_id = $1
      `, [cohortId]),

      // Cohort chapter aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_chapter_aggregates 
        WHERE cohort_id = $1
      `, [cohortId]),

      // Cohort student aggregates - get students in this cohort
      DatabaseConnection.query(`
        SELECT 
          s.id as student_id,
          s.student_email,
          s.student_first,
          s.student_last,
          s.school_id,
          COUNT(spo.id) as total_lessons,
          COUNT(CASE WHEN spo.is_required = true THEN 1 END) as required_lessons,
          COUNT(CASE WHEN spo.completion_date IS NOT NULL THEN 1 END) as completed_lessons,
          COUNT(CASE WHEN spo.is_required = true AND spo.completion_date IS NOT NULL THEN 1 END) as completed_required_lessons
        FROM entities_students s
        LEFT JOIN student_progress_optimized spo ON s.id = spo.student_id
        WHERE s.cohort_id = $1
        GROUP BY s.id, s.student_email, s.student_first, s.student_last, s.school_id
        ORDER BY s.student_last, s.student_first
      `, [cohortId]),
    ]);

    res.status(200).json({
      cohortAggregate: cohortAggregate.rows,
      curriculumAggregate: curriculumAggregate.rows,
      collectionAggregate: collectionAggregate.rows,
      courseAggregate: courseAggregate.rows,
      chapterAggregate: chapterAggregate.rows,
      studentAggregate: studentAggregate.rows,
    });
  } catch (error: any) {
    console.error('Error fetching cohort aggregates:', error);
    res.status(500).json({ error: error.message });
  }
} 