// ============================================================================
// API SERVICE - The Data Fetching Layer
// ============================================================================
// 
// PURPOSE: This service provides a clean, type-safe interface to all Next.js API endpoints.
// It abstracts away the HTTP details and provides a consistent API for data fetching.
// 
// ARCHITECTURE: This is the only place in the frontend that makes HTTP requests.
// All components get their data through App.tsx, which calls methods in this service.
// 
// DATA FLOW:
// 1. Component needs data → App.tsx calls ApiService method
// 2. ApiService makes HTTP request to Next.js API route
// 3. Next.js API route queries PostgreSQL database
// 4. Data flows back: Database → API Route → ApiService → App.tsx → Component
// 
// PERFORMANCE FEATURES:
// - AbortController support for canceling requests
// - Consistent error handling across all endpoints
// - Type-safe responses (when possible)
// - Centralized logging for debugging
// 
// IMPORTANT: This service never manages state or processes data.
// It only fetches data and returns it to the caller (App.tsx).
// ============================================================================

export class ApiService {
  private static baseUrl = '/api';

  // Helper method to make API calls with AbortController support
  private static async fetchWithSignal(endpoint: string, signal?: AbortSignal, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Updated methods with AbortController support
  static async getSchools(signal?: AbortSignal) {
    return this.fetchWithSignal('schools', signal);
  }

  static async getCohorts(schoolId: number, signal?: AbortSignal) {
    return this.fetchWithSignal(`cohorts?schoolId=${schoolId}`, signal);
  }

  static async getStudentsForSchool(schoolId: number, signal?: AbortSignal) {
    return this.fetchWithSignal(`students?schoolId=${schoolId}`, signal);
  }

  // ================================================================================
  // AGGREGATE DATA METHODS - Materialized Views for Lightning Fast Performance
  // ================================================================================
  // 
  // PERFORMANCE CRITICAL: These methods use materialized views instead of real-time calculations.
  // This provides sub-second response times even with millions of data points.
  // 
  // MATERIALIZED VIEWS USED:
  // - mv_school_unfiltered_aggregates: Overall school metrics
  // - mv_school_curriculum_aggregates: Metrics by curriculum
  // - mv_school_collection_aggregates: Metrics by collection
  // - mv_school_course_aggregates: Metrics by course
  // - mv_school_chapter_aggregates: Metrics by chapter
  // - mv_student_unfiltered_aggregates: Student-level aggregates
  // - mv_cohort_*_aggregates: Cohort-specific versions of the above
  // 
  // REFRESH STRATEGY: Materialized views are refreshed daily via automated scripts.
  // This ensures data is current while maintaining performance.
  // 
  // IMPORTANT: These methods return pre-calculated summaries, not individual records.
  // For individual student data, use getIndividualStudentData() instead.

  /**
   * Get all aggregate data for a school from materialized views
   * This provides lightning-fast responses by using pre-calculated aggregates
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
   * PERFORMANCE: This single call loads ALL data needed for the entire school.
   * Subsequent filtering happens in the frontend using the pre-loaded data.
   */
  static async getAggregatedDataForSchool(schoolId: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 ApiService.getAggregatedDataForSchool() called for schoolId:', schoolId);
    }
    
    try {
      const response = await fetch(`/api/school-aggregates?schoolId=${schoolId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ ApiService.getAggregatedDataForSchool() completed:', {
          schoolId,
          schoolAggregateCount: data.schoolAggregate?.length || 0,
          curriculumAggregateCount: data.curriculumAggregate?.length || 0,
          collectionAggregateCount: data.collectionAggregate?.length || 0,
          courseAggregateCount: data.courseAggregate?.length || 0,
          chapterAggregateCount: data.chapterAggregate?.length || 0,
          studentAggregateCount: data.studentAggregate?.length || 0,
          cohortAggregateCount: data.cohortAggregate?.length || 0
        });
      }
      
      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ ApiService.getAggregatedDataForSchool() failed:', error);
      }
      throw error;
    }
  }

  /**
   * Get cohort-specific aggregate data from materialized views
   * This provides lightning-fast responses for cohort-level analytics
   */
  static async getCohortAggregates(cohortId: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 ApiService.getCohortAggregates() called for cohortId:', cohortId);
    }
    
    try {
      const response = await fetch(`/api/cohort-aggregates?cohortId=${cohortId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ ApiService.getCohortAggregates() completed:', {
          cohortId,
          cohortAggregateCount: data.cohortAggregate?.length || 0,
          curriculumAggregateCount: data.curriculumAggregate?.length || 0,
          collectionAggregateCount: data.collectionAggregate?.length || 0,
          courseAggregateCount: data.courseAggregate?.length || 0,
          chapterAggregateCount: data.chapterAggregate?.length || 0,
          studentAggregateCount: data.studentAggregate?.length || 0
        });
      }
      
      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ ApiService.getCohortAggregates() failed:', error);
      }
      throw error;
    }
  }

  // ============================================================================
  // CURRICULUM HIERARCHY
  // ============================================================================

  static async getCurriculumHierarchy(signal?: AbortSignal) {
    return this.fetchWithSignal('curriculum-hierarchy', signal);
  }

  /**
   * Get individual student data for detailed analysis
   * This is used when a specific student is selected for granular data
   * 
   * PURPOSE: This method provides the raw lesson completion records for a specific student.
   * It's used when the user wants to see detailed, lesson-by-lesson progress instead of
   * aggregate summaries.
   * 
   * DATA RETURNED:
   * - Raw lesson completion records from student_progress_optimized table
   * - Each record includes: lesson_id, completion_date, is_required, curriculum info
   * - Joined with curriculum hierarchy tables for lesson metadata
   * 
   * PERFORMANCE CONSIDERATIONS:
   * - This can return thousands of records for a single student
   * - API call typically takes 1-3 seconds depending on data volume
   * - Data is loaded on-demand (not pre-loaded like aggregates)
   * - Used only when a student is selected for detailed analysis
   * 
   * IMPORTANT: This is the ONLY method that returns individual lesson records.
   * All other methods return pre-calculated aggregates for performance.
   */
  static async getIndividualStudentData(studentId: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 ApiService.getIndividualStudentData() called for studentId:', studentId);
    }
    
    try {
      const response = await fetch(`/api/student-data?studentId=${studentId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ ApiService.getIndividualStudentData() completed:', {
          studentId,
          lessonCount: data.length || 0
        });
      }
      
      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ ApiService.getIndividualStudentData() failed:', error);
      }
      throw error;
    }
  }
}

export default ApiService; 