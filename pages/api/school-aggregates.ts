import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseConnection } from './db';

/**
 * SCHOOL AGGREGATES API ENDPOINT
 * 
 * PURPOSE: This endpoint provides all aggregate data for a school in a single API call.
 * It's the primary data source for the application's high-performance data display.
 * 
 * PERFORMANCE STRATEGY: Uses materialized views instead of real-time calculations.
 * This provides sub-second response times even with millions of data points.
 * 
 * DATA RETURNED:
 * - School-wide aggregates (overall metrics)
 * - Curriculum-specific aggregates (filtered by curriculum)
 * - Collection-specific aggregates (filtered by collection)
 * - Course-specific aggregates (filtered by course)
 * - Chapter-specific aggregates (filtered by chapter)
 * - Student-level aggregates (for student selector)
 * - Cohort-specific versions of all the above (for cohort switching)
 * 
 * MATERIALIZED VIEWS USED:
 * - mv_school_unfiltered_aggregates: Overall school metrics
 * - mv_school_curriculum_aggregates: Metrics by curriculum
 * - mv_school_collection_aggregates: Metrics by collection
 * - mv_school_course_aggregates: Metrics by course
 * - mv_school_chapter_aggregates: Metrics by chapter
 * - mv_student_unfiltered_aggregates: Student-level aggregates
 * - mv_cohort_*_aggregates: Cohort-specific versions
 * 
 * IMPORTANT: This endpoint returns pre-calculated summaries, not individual records.
 * For individual student data, use the /api/student-data endpoint instead.
 */
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  // Only allow GET request
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Get the schoolId from the query parameters
  const { schoolId } = request.query;

  // If no schoolId is provided, return an error
  if (!schoolId) {
    return response.status(400).json({ error: 'schoolId is required' });
  }

  const startTime = Date.now();

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Starting school aggregates query for schoolId: ${schoolId}`);
    }

    const [
      schoolAggregate,
      curriculumAggregate,
      schoolCollectionAggregate,
      schoolCourseAggregate,
      schoolChapterAggregate,
      schoolStudentAggregate,
      // Cohort aggregates for the school
      cohortAggregate,
      cohortCurriculumAggregate,
      cohortCollectionAggregate,
      cohortCourseAggregate,
      cohortChapterAggregate,
      cohortStudentAggregate,
    ] = await Promise.all([
      // School aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_school_unfiltered_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Curriculum aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_school_curriculum_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Collection aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_school_collection_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Course aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_school_course_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Chapter aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_school_chapter_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Student aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_student_unfiltered_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Cohort aggregates for the school
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_unfiltered_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Cohort curriculum aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_curriculum_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Cohort collection aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_collection_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Cohort course aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_course_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Cohort chapter aggregates
      DatabaseConnection.query(`
        SELECT * FROM mv_cohort_chapter_aggregates 
        WHERE school_id = $1
      `, [schoolId]),

      // Cohort student aggregates - get all students in cohorts for this school
      // 
      // CRITICAL: This query provides students with their cohort_id, which enables
      // instant cohort filtering in the frontend without additional database queries.
      // 
      // DATA RETURNED:
      // - All students in the school with their cohort assignments
      // - Pre-calculated lesson counts for each student
      // - Includes both required and optional lesson metrics
      // 
      // PERFORMANCE: This single query loads all students for all cohorts in the school.
      // The frontend can then filter by cohort_id without additional API calls.
      // 
      // IMPORTANT: The cohort_id field is essential for the cohort selection feature.
      // Without it, we couldn't filter students by cohort in the frontend.
      // 
      DatabaseConnection.query(`
        SELECT 
          s.id as student_id,
          s.student_email,
          s.student_first,
          s.student_last,
          s.school_id,
          s.cohort_id,
          COUNT(spo.id) as total_lessons,
          COUNT(CASE WHEN spo.is_required = true THEN 1 END) as required_lessons,
          COUNT(CASE WHEN spo.completion_date IS NOT NULL THEN 1 END) as completed_lessons,
          COUNT(CASE WHEN spo.is_required = true AND spo.completion_date IS NOT NULL THEN 1 END) as completed_required_lessons
        FROM entities_students s
        LEFT JOIN student_progress_optimized spo ON s.id = spo.student_id
        WHERE s.school_id = $1
        GROUP BY s.id, s.student_email, s.student_first, s.student_last, s.school_id, s.cohort_id
        ORDER BY s.student_last, s.student_first
      `, [schoolId]),
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;


    console.log(`✅ School aggregates query completed in ${duration}ms for schoolId: ${schoolId}`)

    response.status(200).json({
      schoolAggregate: schoolAggregate.rows,
      curriculumAggregate: curriculumAggregate.rows,
      schoolCollectionAggregate: schoolCollectionAggregate.rows,
      schoolCourseAggregate: schoolCourseAggregate.rows,
      schoolChapterAggregate: schoolChapterAggregate.rows,
      schoolStudentAggregate: schoolStudentAggregate.rows,
      // Cohort data for the school
      cohortAggregate: cohortAggregate.rows,
      cohortCurriculumAggregate: cohortCurriculumAggregate.rows,
      cohortCollectionAggregate: cohortCollectionAggregate.rows,
      cohortCourseAggregate: cohortCourseAggregate.rows,
      cohortChapterAggregate: cohortChapterAggregate.rows,
      cohortStudentAggregate: cohortStudentAggregate.rows, // Students grouped by cohort
    });
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error(`❌ School aggregates query failed after ${duration}ms for schoolId: ${schoolId}`, error);
    response.status(500).json({ error: error.message });
  }
} 