/**
 * APPLICATION TYPES - Single Source of Truth for All TypeScript Interfaces
 * 
 * PURPOSE: This file contains all TypeScript interfaces used throughout the application.
 * It serves as the single source of truth for data structures, preventing duplication
 * and ensuring consistency across components and services.
 * 
 * ORGANIZATION:
 * 1. Core Entity Types (School, Student, etc.)
 * 2. Curriculum Hierarchy Types (Curriculum, Collection, Course, Chapter, Lesson)
 * 3. Aggregate Data Types (pre-calculated metrics from materialized views)
 * 4. Utility Types and Functions
 * 5. Legacy/Backend Types (for backend compatibility)
 */

// ================================================================================
// CORE ENTITY TYPES - Basic data structures
// ================================================================================

export interface School {
  id: number;
  school_name: string; // Note: Using school_name to match database schema
}

export interface Student {
  id: number;
  student_email: string;
  student_first: string;
  student_last: string;
  school_id: number;
}

// ================================================================================
// CURRICULUM HIERARCHY TYPES - Educational content structure
// ================================================================================

export interface Curriculum {
  id: number;
  curriculum_name: string;
}

export interface Collection {
  id: number;
  collection_name: string;
  curriculum_id: number;
}

export interface Course {
  id: number;
  course_name: string;
  collection_id: number;
}

export interface Chapter {
  id: number;
  chapter_name: string;
  course_id: number;
}

export interface Lesson {
  id: number;
  student_id: number;
  lesson_id: number;
  lesson_name: string;
  chapter_id: number;
  chapter_name: string;
  course_id: number;
  course_name: string;
  collection_id: number;
  collection_name: string;
  curriculum_id: number;
  curriculum_name: string;
  school_id: number;
  school_name: string;
  engagement_date: string;   
  completion_date: string;
  total_time: number;
  is_required: boolean;
  is_completed: boolean;
}

// ================================================================================
// COMPOSITE TYPES - Combinations of basic types
// ================================================================================

export interface IndividualStudentData {
  student_id: number;
  student_email: string;
  student_first: string;
  student_last: string;
  school_id: number;
  lessons: Lesson[];
}

export interface Students {
  id: number;
  students: Student[];
}

// ================================================================================
// FILTER STATE TYPES - For curriculum filtering
// ================================================================================

export interface CurriculumFiltersState {
  curriculum: string;
  collection: string;
  course: string;
  chapter: string;
  lesson: string;
}


// === AGGREGATE DATA TYPES ===


// SchoolAggregate is used when no Curricular Filter is selected AND no student is selected. Nonactionable data that loads fast so something is shown. 
export interface SchoolAggregate {
  school_id: number;
  school_name: string;
  total_students: number;
  total_lessons_expected: number;
  total_lessons_engaged: number;
  total_lessons_completed: number;
  total_lessons_in_progress: number;
  total_lessons_not_started: number;
  total_completion_percentage: number;
  required_lessons_expected: number;
  required_lessons_completed: number;
  required_lessons_in_progress: number;
  required_lessons_not_started: number;
  required_completion_percentage: number;
  last_updated: string;
}

// The following aggregates are used when NO student is selected but curriculum filters are applied. This is again, generally not actionable data, but the data tables change when a user clicks something, so it looks like the application is responsive. 

export interface CurriculumAggregate {
  school_id: number;
  school_name: string;
  curriculum_id: number;
  curriculum_name: string;
  total_students: number;
  total_lessons_expected: number;
  total_lessons_engaged: number;
  total_lessons_completed: number;
  total_lessons_in_progress: number;
  total_lessons_not_started: number;
  total_completion_percentage: number;
  required_lessons_expected: number;
  required_lessons_completed: number;
  required_lessons_in_progress: number;
  required_lessons_not_started: number;
  required_completion_percentage: number;
  last_updated: string;
}

export interface CollectionAggregate {
  school_id: number;
  school_name: string;
  curriculum_id: number;
  curriculum_name: string;
  collection_id: number;
  collection_name: string;
  total_students: number;
  total_lessons_expected: number;
  total_lessons_engaged: number;
  total_lessons_completed: number;
  total_lessons_in_progress: number;
  total_lessons_not_started: number;
  total_completion_percentage: number;
  required_lessons_expected: number;
  required_lessons_completed: number;
  required_lessons_in_progress: number;
  required_lessons_not_started: number;
  required_completion_percentage: number;
  last_updated: string;
}

export interface CourseAggregate {
  school_id: number;
  school_name: string;
  collection_id: number;
  collection_name: string;
  course_id: number;
  course_name: string;
  total_students: number;
  total_lessons_expected: number;
  total_lessons_engaged: number;
  total_lessons_completed: number;
  total_lessons_in_progress: number;
  total_lessons_not_started: number;
  total_completion_percentage: number;
  required_lessons_expected: number;
  required_lessons_completed: number;
  required_lessons_in_progress: number;
  required_lessons_not_started: number;
  required_completion_percentage: number;
  last_updated: string;
}

export interface ChapterAggregate {
  school_id: number;
  school_name: string;
  course_id: number;
  course_name: string;
  chapter_id: number;
  chapter_name: string;
  total_students: number;
  total_lessons_expected: number;
  total_lessons_engaged: number;
  total_lessons_completed: number;
  total_lessons_in_progress: number;
  total_lessons_not_started: number;
  total_completion_percentage: number;
  required_lessons_expected: number;
  required_lessons_completed: number;
  required_lessons_in_progress: number;
  required_lessons_not_started: number;
  required_completion_percentage: number;
  last_updated: string;
}

//Used when no Curricular Filter is applied and one student is selected. Represents the overall progress of the student across all curricula. 
export interface StudentAggregate {
  student_id: number;
  student_email: string;
  student_first: string;
  student_last: string;
  school_id: number;
  school_name:string;
  total_lessons_expected: number;
  total_lessons_engaged: number;
  total_lessons_completed: number;
  total_lessons_in_progress: number;
  total_lessons_not_started: number;
  total_completion_percentage: number;
  required_lessons_expected: number;
  required_lessons_completed: number;
  required_lessons_in_progress: number;
  required_lessons_not_started: number;
  required_completion_percentage: number;
}


export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}





// Utility function to calculate completed lessons from completion rate
export function calculateCompletedLessons(completionRate: number, totalLessons: number): number {
  if (completionRate > 0 && totalLessons > 0) {
    return Math.round((completionRate / 100) * totalLessons);
  }
  return 0;
}

// New unified aggregates type to replace parallel arrays
export type AggregatesScope = 'school' | 'cohort' | 'student';
export type AggregatesLevel = 'school' | 'curriculum' | 'collection' | 'course' | 'chapter' | 'student';

export interface Aggregates {
  school: {
    school: any[];
    curriculum: any[];
    collection: any[];
    course: any[];
    chapter: any[];
    student: any[];
  };
  cohort: {
    school: any[];
    curriculum: any[];
    collection: any[];
    course: any[];
    chapter: any[];
    student: any[];
  };
  student: {
    school: any[];
    curriculum: any[];
    collection: any[];
    course: any[];
    chapter: any[];
    student: any[];
  };
}

// Helper type for current scope/level
export interface CurrentAggregates {
  scope: AggregatesScope;
  level: AggregatesLevel;
  data: any[];
}

