/**
 * APP COMPONENT - Central State Management & Data Flow Controller
 * 
 * PURPOSE: This is the single source of truth for all application state and data flow.
 * It orchestrates the entire user experience from authentication to data visualization.
 * 
 * CRITICAL ARCHITECTURE DECISION: All state management is centralized in App.tsx.
 * Child components are "dumb" - they only receive props and call callback functions.
 * This prevents prop drilling, state synchronization issues, and makes debugging easier.
 * 
 * DATA FLOW ARCHITECTURE:
 * 1. Authentication → Faculty auto-selection → School loading → Cohort/Student selection → Data visualization
 * 2. All data fetching happens through ApiService.ts (which calls Next.js API routes)
 * 3. Materialized views provide lightning-fast aggregate data for schools and cohorts
 * 4. Individual student data is fetched on-demand when a student is selected
 * 
 * PERFORMANCE OPTIMIZATION: We use pre-calculated aggregates from materialized views
 * instead of real-time calculations. This provides sub-second response times even with
 * millions of data points. Individual student data is only loaded when needed.
 * 
 * KEY STATE VARIABLES:
 * - selectedSchoolId: Controls which school's data is loaded and displayed
 * - selectedCohortId: Filters data to a specific cohort within the school
 * - selectedStudentId: Switches from aggregate view to individual student view
 * - Various aggregate arrays: Pre-calculated data from materialized views
 * 
 * WHY THIS APPROACH WORKS:
 * 1. Single source of truth prevents state inconsistencies
 * 2. Materialized views eliminate expensive real-time calculations
 * 3. Lazy loading of individual student data keeps initial load fast
 * 4. Clear separation between aggregate and individual data prevents confusion
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ApiService } from './services/ApiService';
import { School, Student, Lesson, SchoolAggregate, CurriculumAggregate, CollectionAggregate, CourseAggregate, ChapterAggregate, StudentAggregate } from './types';
import SchoolSelector from './components/SchoolSelector';
import StudentSelector from './components/StudentSelector';
import CurriculumFilters from './components/CurriculumFilters';
import ProgressChart from './components/ProgressChart';
import CohortSelector from './components/CohortSelector';
import FacultyImpersonationDebug from './components/FacultyImpersonationDebug';
import { FacultyProvider, useFaculty } from './contexts/FacultyContext';
import { authService, FacultyUser } from './services/AuthService';
import LoginForm from './components/LoginForm';
import LazyLoadProgressComponent from './components/LazyLoadProgress';

type Cohort = {
  id: number;
  cohort_name: string;
};

const AppContent: React.FC = () => {
  const { currentFaculty } = useFaculty();
  
  // Only log on mount in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 App component mounted');
    }
  }, []);
  
  // ================================================================================
  // AUTHENTICATION STATE
  // ================================================================================
  const [currentUser, setCurrentUser] = useState<FacultyUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
    // ================================================================================
  // STATE MANAGEMENT - SINGLE SOURCE OF TRUTH
  // ================================================================================
  // 
  // CRITICAL: All state management is centralized in App.tsx. This is intentional and by design.
  // 
  // WHY CENTRALIZED STATE MANAGEMENT:
  // 1. Prevents prop drilling and state synchronization issues
  // 2. Makes debugging easier - all state changes happen in one place
  // 3. Ensures data consistency across all components
  // 4. Simplifies component testing - components are pure functions
  // 
  // DATA FLOW PATTERN:
  // 1. User interaction → App.tsx handler function → State update → Re-render with new props
  // 2. All data fetching happens through ApiService.ts (which calls Next.js API routes)
  // 3. Child components are "dumb" - they only receive props and call callback functions
  // 4. No component manages its own state - everything flows through App.tsx
  // 
  // ================================================================================
  // STATIC DATA - Loaded once on page load
  // ================================================================================
  
  // Generic curriculum hierarchy used to populate curriculum filters
  // This is loaded once and never changes - it's the master list of all possible filters
  const [schools, setSchools] = useState<School[]>([]);
  const [curriculumHierarchy, setCurriculumHierarchy] = useState<any>(null); 
  


  // ================================================================================
  // USER SELECTION STATE - The core of the application flow
  // ================================================================================
  // 
  // These three IDs control the entire application state and data flow.
  // They work together in a hierarchical relationship:
  // 
  // SCHOOL → COHORT → STUDENT
  // 
  // Each level filters the data more specifically:
  // - School: Shows all data for the entire school
  // - Cohort: Shows data filtered to a specific cohort within the school
  // - Student: Shows individual student data instead of aggregates
  // 
  // IMPORTANT: When a higher level changes, all lower levels are cleared.
  // This prevents showing stale or incorrect data.
  // 
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  
  // Individual student data is loaded on-demand when a student is selected
  // This contains the raw lesson completion data for detailed analysis
  // When null, the app shows aggregate data instead
  const [individualStudentData, setIndividualStudentData] = useState<any[] | null>(null);
  
  // ================================================================================
  // AGGREGATE DATA - Lightning-fast pre-calculated metrics from materialized views
  // ================================================================================
  // 
  // PERFORMANCE CRITICAL: These arrays contain pre-calculated aggregate data from materialized views.
  // This is the key to sub-second response times even with millions of data points.
  // 
  // HOW IT WORKS:
  // 1. Database materialized views are refreshed daily with pre-calculated aggregates
  // 2. When a school is selected, we load ALL aggregate data for that school in one API call
  // 3. As users apply filters, we use the pre-loaded data instead of making new API calls
  // 4. This eliminates expensive real-time calculations and provides instant filtering
  // 
  // DATA SOURCE: These come from the /api/school-aggregates endpoint, which queries:
  // - mv_school_aggregates: Overall school metrics
  // - mv_curriculum_aggregates: Metrics by curriculum
  // - mv_collection_aggregates: Metrics by collection
  // - mv_course_aggregates: Metrics by course
  // - mv_chapter_aggregates: Metrics by chapter
  // - mv_student_unfiltered_aggregates: Student-level aggregates
  // 
  // IMPORTANT: These are NOT individual lesson records. They are pre-calculated summaries
  // that tell us things like "Chapter X has 150 total lessons, 120 completed, 100 required, 80 required completed"
  // 
  const [schoolAggregates, setSchoolAggregates] = useState<SchoolAggregate[]>([]);
  const [curriculumAggregates, setCurriculumAggregates] = useState<CurriculumAggregate[]>([]);
  const [collectionAggregates, setCollectionAggregates] = useState<CollectionAggregate[]>([]);
  const [courseAggregates, setCourseAggregates] = useState<CourseAggregate[]>([]);
  const [chapterAggregates, setChapterAggregates] = useState<ChapterAggregate[]>([]);
  const [studentAggregates, setStudentAggregates] = useState<StudentAggregate[]>([]);
  
  // Students available for selection in the StudentSelector component
  // This is filtered based on the current school/cohort selection
  const [studentsForSelector, setStudentsForSelector] = useState<Student[]>([]);
  
  // ================================================================================
  // COHORT AGGREGATE DATA - Pre-filtered data for each cohort within the school
  // ================================================================================
  // 
  // PERFORMANCE OPTIMIZATION: When a school is selected, we load ALL cohort data for that school.
  // This allows instant cohort switching without additional API calls.
  // 
  // HOW IT WORKS:
  // 1. School selection loads both school-wide AND cohort-specific aggregates
  // 2. When a cohort is selected, we filter the pre-loaded cohort data
  // 3. No additional API calls needed for cohort switching
  // 4. This provides instant response when switching between cohorts
  // 
  // DATA SOURCE: These also come from /api/school-aggregates, which includes:
  // - mv_cohort_unfiltered_aggregates: Overall cohort metrics
  // - mv_cohort_curriculum_aggregates: Cohort metrics by curriculum
  // - mv_cohort_collection_aggregates: Cohort metrics by collection
  // - mv_cohort_course_aggregates: Cohort metrics by course
  // - mv_cohort_chapter_aggregates: Cohort metrics by chapter
  // - Direct query to entities_students: Students grouped by cohort
  // 
  // IMPORTANT: The cohortStudentAggregates contains students with their cohort_id,
  // which allows us to filter students by cohort without additional database queries.
  // 
  const [cohortAggregates, setCohortAggregates] = useState<any[]>([]);
  const [cohortCurriculumAggregates, setCohortCurriculumAggregates] = useState<any[]>([]);
  const [cohortCollectionAggregates, setCohortCollectionAggregates] = useState<any[]>([]);
  const [cohortCourseAggregates, setCohortCourseAggregates] = useState<any[]>([]);
  const [cohortChapterAggregates, setCohortChapterAggregates] = useState<any[]>([]);
  const [cohortStudentAggregates, setCohortStudentAggregates] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false); // Separate loading for student operations
  const [error, setError] = useState<string | null>(null);

  // ================================================================================
  // CURRICULUM FILTERS - Hierarchical filtering system
  // ================================================================================
  // 
  // CURRICULUM HIERARCHY: Curriculum → Collection → Course → Chapter → Lesson
  // 
  // These filters work together to drill down from broad to specific:
  // - Curriculum: Broadest level (e.g., "Clinical", "Basic Sciences")
  // - Collection: Group of related courses (e.g., "Emergency Medicine")
  // - Course: Specific course (e.g., "Emergency Medicine: Common Emergencies")
  // - Chapter: Specific chapter within a course (e.g., "Acute Coronary Syndrome")
  // - Lesson: Individual lesson (currently not used in filtering)
  // 
  // FILTERING BEHAVIOR:
  // 1. When a higher-level filter is selected, all lower-level filters are cleared
  // 2. Filters apply to both aggregate data and individual student data
  // 3. The ProgressChart automatically updates to show filtered metrics
  // 4. Filters work with both school-wide and cohort-specific data
  // 
  // WHY IN CENTRAL STATE: Multiple components need access to these filters:
  // - CurriculumFilters component: Displays and manages the filter UI
  // - ProgressChart component: Uses filters to calculate display metrics
  // - Future components: Will likely need filter state for their own calculations
  // 
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<number | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  


  // Compute per-student aggregates if a student is selected
  /*
  perStudentAggregates = {
     collectionAggregates: [
       { collection_id: 1, collection_name: "Family Medicine", total_lessons: 269, completed_lessons: 45 },
       { collection_id: 2, collection_name: "Emergency Medicine", total_lessons: 156, completed_lessons: 23 }
      ],
      courseAggregates: [
        {course_id: 1, course_name: "Family Medicine", total_lessons: 269, completed_lessons: 45},
        {course_id: 2, course_name: "Emergency Medicine", total_lessons: 156, completed_lessons: 23}
      ],
      chapterAggregates: [
        {chapter_id: 1, chapter_name: "Chapter 1", total_lessons: 269, completed_lessons: 45},
        {chapter_id: 2, chapter_name: "Chapter 2", total_lessons: 156, completed_lessons: 23}
      ]
    }
}
*/
  const perStudentAggregates = useMemo(() => {
    if (!selectedStudentId || !individualStudentData || !Array.isArray(individualStudentData)) {
      return { collectionAggregates: [], courseAggregates: [], chapterAggregates: [] };
    }

    // Simple aggregation function
    const collectionMap = new Map();
    const courseMap = new Map();
    const chapterMap = new Map();

    individualStudentData.forEach(lesson => {
      // Collection level aggregation
      const collectionKey = `${lesson.collection_id}-${lesson.collection_name}`;
      if (!collectionMap.has(collectionKey)) {
        collectionMap.set(collectionKey, {
          collection_id: lesson.collection_id,
          collection_name: lesson.collection_name,
          total_lessons: 0,
          completed_lessons: 0
        });
      }
      const collection = collectionMap.get(collectionKey);
      collection.total_lessons++;
      if (lesson.completion_date) collection.completed_lessons++;

      // Course level aggregation
      const courseKey = `${lesson.course_id}-${lesson.course_name}`;
      if (!courseMap.has(courseKey)) {
        courseMap.set(courseKey, {
          course_id: lesson.course_id,
          course_name: lesson.course_name,
          total_lessons: 0,
          completed_lessons: 0
        });
      }
      const course = courseMap.get(courseKey);
      course.total_lessons++;
      if (lesson.completion_date) course.completed_lessons++;

      // Chapter level aggregation
      const chapterKey = `${lesson.chapter_id}-${lesson.chapter_name}`;
      if (!chapterMap.has(chapterKey)) {
        chapterMap.set(chapterKey, {
          chapter_id: lesson.chapter_id,
          chapter_name: lesson.chapter_name,
          total_lessons: 0,
          completed_lessons: 0
        });
      }
      const chapter = chapterMap.get(chapterKey);
      chapter.total_lessons++;
      if (lesson.completion_date) chapter.completed_lessons++;
    });

    return {
      collectionAggregates: Array.from(collectionMap.values()),
      courseAggregates: Array.from(courseMap.values()),
      chapterAggregates: Array.from(chapterMap.values())
    };
  }, [selectedStudentId, individualStudentData]);

  // ================================================================================
  // CALCULATED STUDENT METRICS - Real-time calculations from individual student data
  // ================================================================================
  // 
  // PURPOSE: When a student is selected, we switch from aggregate data to individual student data.
  // This calculatedStudentMetrics provides the same interface as aggregate data but uses
  // real-time calculations from the individual student's lesson completion records.
  // 
  // DATA SOURCE: This comes from individualStudentData, which is loaded from:
  // - /api/student-data endpoint
  // - Contains raw lesson completion records for the selected student
  // - Each record includes: lesson_id, completion_date, is_required, etc.
  // 
  // CALCULATION LOGIC:
  // - Applies curriculum filters to individualStudentData (same logic as ProgressChart)
  // - totalLessons: Count of filtered lessons assigned to the student
  // - totalCompleted: Count of filtered lessons with a completion_date
  // - requiredLessons: Count of filtered lessons where is_required = true
  // - requiredCompleted: Count of filtered required lessons with a completion_date
  // 
  // PERFORMANCE: This is memoized to prevent unnecessary recalculations.
  // It recalculates when student data or curriculum filters change.
  // 
  // IMPORTANT: This provides filtered student metrics that respect curriculum filters.
  // When no filters are applied, it shows overall student progress.
  // When filters are applied, it shows student progress for that specific curriculum level.
  // 
  const calculatedStudentMetrics = useMemo(() => {
    if (!selectedStudentId || !individualStudentData || !Array.isArray(individualStudentData)) {
      return null;
    }

    // Apply curriculum filters to the student data (same logic as ProgressChart)
    let filteredData = individualStudentData;

    // Apply curriculum filters in order of specificity (most specific first)
    if (selectedChapterId) {
      filteredData = filteredData.filter(lesson => lesson.chapter_id === selectedChapterId);
    } else if (selectedCourseId) {
      filteredData = filteredData.filter(lesson => lesson.course_id === selectedCourseId);
    } else if (selectedCollectionId) {
      filteredData = filteredData.filter(lesson => lesson.collection_id === selectedCollectionId);
    } else if (selectedCurriculumId) {
      filteredData = filteredData.filter(lesson => lesson.curriculum_id === selectedCurriculumId);
    }

    // Calculate metrics from filtered data
    const totalLessons = filteredData.length;
    const totalCompleted = filteredData.filter(lesson => lesson.completion_date).length;
    const requiredLessons = filteredData.filter(lesson => lesson.is_required).length;
    const requiredCompleted = filteredData.filter(lesson => lesson.is_required && lesson.completion_date).length;

    // Generate appropriate title based on filters
    let title = 'Student Progress';
    if (selectedChapterId) {
      const chapter = filteredData[0];
      title = `Student: ${chapter?.chapter_name || 'Chapter'}`;
    } else if (selectedCourseId) {
      const course = filteredData[0];
      title = `Student: ${course?.course_name || 'Course'}`;
    } else if (selectedCollectionId) {
      const collection = filteredData[0];
      title = `Student: ${collection?.collection_name || 'Collection'}`;
    } else if (selectedCurriculumId) {
      const curriculum = filteredData[0];
      title = `Student: ${curriculum?.curriculum_name || 'Curriculum'}`;
    }

    return {
      totalLessons,
      totalCompleted,
      requiredLessons,
      requiredCompleted,
      title
    };
  }, [selectedStudentId, individualStudentData, selectedCurriculumId, selectedCollectionId, selectedCourseId, selectedChapterId]);

  // ================================================================================
  // STEP 1A: CHECK AUTHENTICATION ON PAGE LOAD
  // ================================================================================
  
  useEffect(() => {
    checkAuthentication();
  }, []);  // Empty dependency array = run once on mount

  // ================================================================================
  // STEP 1B: LOAD SCHOOLS ON PAGE LOAD (after auth)
  // ================================================================================
  
  useEffect(() => {
    if (isAuthenticated) {
      loadSchools();
      
      // Load curriculum hierarchy after authentication
      const loadCurriculumHierarchy = async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Loading curriculum hierarchy...');
          }
          const hierarchy = await ApiService.getCurriculumHierarchy();
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Curriculum hierarchy loaded:', hierarchy?.length || 0, 'items');
          }
          setCurriculumHierarchy(hierarchy);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ Failed to load curriculum hierarchy:', error);
          }
        }
      };

      loadCurriculumHierarchy();
    }
  }, [isAuthenticated]);  // Run when authentication state changes

  // ================================================================================
  // AUTHENTICATION FUNCTIONS
  // ================================================================================
  
  const checkAuthentication = async () => {
    try {
      setAuthLoading(true);
      const user = await authService.getCurrentUser();
      
      if (user) {
        setCurrentUser(user);
        setIsAuthenticated(true);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ User authenticated:', user.email);
        }
      } else {
        setIsAuthenticated(false);
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ No authenticated user found');
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Authentication check failed:', error);
      }
      setIsAuthenticated(false);
      setAuthError('Authentication check failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSuccess = (user: any) => {
    // Convert User to FacultyUser if needed
    const facultyUser: FacultyUser = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      school_id: user.school_id,
      school_name: user.school_name || 'Unknown School',
      role: user.role,
      can_access_all_schools: user.role === 'supaadmin'
    };
    
    setCurrentUser(facultyUser);
    setIsAuthenticated(true);
    setAuthError(null);
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Login successful:', facultyUser.email);
    }
  };

  const handleUserChange = (user: FacultyUser | null) => {
    if (user) {
      handleLoginSuccess(user);
    } else {
      handleLogout();
    }
  };

  const handleLoginError = (error: string) => {
    setAuthError(error);
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      
      // Clear all data
      setSelectedSchoolId(null);
      setSelectedCohortId(null);
      setSelectedStudentId(null);
      setIndividualStudentData(null);
      setSchools([]);
      setCohorts([]);
      setStudents([]);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Logout successful');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Logout failed:', error);
      }
    }
  };

  // ================================================================================
  // FACULTY IMPERSONATION: AUTO-SELECT SCHOOL WHEN FACULTY LOGS IN
  // ================================================================================
  
  useEffect(() => {
    if (currentFaculty && schools.length > 0) {
      // Check if this is a supaadmin bypass
      if (currentUser && currentUser.id === -1 && currentUser.role === 'supaadmin') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 supaadmin bypass mode - no auto-selection, full access granted');
        }
        // Don't auto-select anything for supaadmin - let them choose
        return;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('�� Faculty logged in, auto-selecting school:', currentFaculty.school_id);
      }
      
      // Auto-select the faculty member's school
      handleSchoolSelection(currentFaculty.school_id);
      
      // Clear any existing selections to reset to faculty view
      setSelectedCohortId(null);
      setSelectedStudentId(null);
      setIndividualStudentData(null);
      setSelectedCurriculumId(null);
      setSelectedCollectionId(null);
      setSelectedCourseId(null);
      setSelectedChapterId(null);
      setSelectedLessonId(null);
    } else if (!currentFaculty && selectedSchoolId) {
      // Faculty logged out, but we have a school selected - keep it
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Faculty logged out, keeping current school selection');
      }
    }
  }, [currentFaculty, currentUser, schools.length]); // Only run when faculty changes or schools load
  
  const loadSchools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Loading schools...');
      }
      
        // This uses the getSchools function to access entities_schools table and return an array of school objects.
        // It is an array of school_id and school_name, one pair per school. 
        // When we have cohorts, cohorts will be added once the school is selected. The only thing that autofills data is the schools.
      const schoolsData = await ApiService.getSchools();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Schools loaded:', schoolsData);
        console.log('📋 Available schools:', schoolsData.map((s: any) => ({ id: s.id, name: s.school_name, type: typeof s.id })));
      }
      setSchools(schoolsData);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to load schools:', err);
      }
      setError(`Failed to load schools: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ================================================================================
  // STEP 1B: LOAD CURRICULUM HIERARCHY ON PAGE LOAD
  // ================================================================================
  // Because this is generic, we can load it on page load. It will never be called again.  Thus, we can define it inside the useEffect hook. 
  // Load schools could theoretically be called again, like on buttonClick. It is not currently called again, but it could be. So we define it outside of th useEffect hook, calling it within the useEffect hook. 
  // useEffect(() => {
  //   const loadCurriculumHierarchy = async () => {
  //     try {
  //       const hierarchy = await ApiService.getCurriculumHierarchy();
  //       setCurriculumHierarchy(hierarchy);
  //     } catch (error) {
  //       console.error('Failed to load curriculum hierarchy:', error);
  //     }
  //   };

  //   loadCurriculumHierarchy();
  // }, []); 

  // ================================================================================
  // STEP 2: LOAD SCHOOL AGGREGATES WHEN SCHOOL SELECTED
  // ================================================================================
   //Aggregate Data for fast loading. initialize these to empty arrays. When a school is selected, populate these with data from materialized views. As the view is filtered, prepopulated data is used. When a student is selected, we use join tables to get the specific student's data. These are only to fake speed by precalculating every school's aggregate data on every day's auotmatic download and upsert. With lightning fast retrieval of already existing aggregate data. These cannot be deconstructed into the individual components. This is a repeat of tghe same thought process as was in the state managmeent section. 
   // This is Magic (the dark eyeliner kind, not sorcery). This delivers the illusion of speed and visualization of data. Its barely actionable and i can't think of a real use case for it. But hand-waive impressive! 
  
   const handleSchoolSelection = async (schoolId: number | null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏫 School selection triggered:', { schoolId, type: typeof schoolId });
    }
    
    // If a school is deselected, clear all teh fields as though we just logged in
    if (!schoolId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 School deselection - clearing all data');
      }
      // Handle school deselection - clear all school-related data
      setSelectedSchoolId(null);
      setSelectedCohortId(null);
      setCohorts([]);
      setSchoolAggregates([]);
      setCurriculumAggregates([]);
      setCollectionAggregates([]);
      setCourseAggregates([]);
      setChapterAggregates([]);
      setStudentAggregates([]);
      setStudentsForSelector([]);
      setSelectedStudentId(null);
      setIndividualStudentData(null);
      return;
    }

    // Check if user can access this school (supaadmin always allowed)
    if (
      currentUser &&
      !(currentUser.role === 'supaadmin') && // skip check for supaadmin
      !(await authService.canAccessSchool(schoolId))
    ) {
      setError('You do not have permission to access this school');
      return;
    }

    // Handle school selection
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Starting school data load for school ID:', schoolId);
      }
      setLoading(true);
      setError(null);

      // Clear any selected student and cohort when changing schools - should revert to aggregate view
      setSelectedCohortId(null);
      setSelectedStudentId(null);
      setIndividualStudentData(null);

      // Set selected school
      setSelectedSchoolId(schoolId);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to load school aggregates:', err);
      }
      setError(`Failed to load school data: ${err.message}`);
    } 

          try {
            // Load fresh data
            // millenniumFalcon is Dustyn saying "variableName" is irrelevant.
            const [millenniumFalcon, cohortsData] = await Promise.all([
              ApiService.getAggregatedDataForSchool(Number(schoolId)),
              ApiService.getCohorts(Number(schoolId))
            ]);

            // store school level aggregates
            setSchoolAggregates(millenniumFalcon.schoolAggregate || []); 
            setCurriculumAggregates(millenniumFalcon.curriculumAggregate || []);
            setCollectionAggregates(millenniumFalcon.schoolCollectionAggregate || []);
            setCourseAggregates(millenniumFalcon.schoolCourseAggregate || []);
            setChapterAggregates(millenniumFalcon.schoolChapterAggregate || []);
            setStudentAggregates(millenniumFalcon.studentAggregate || []);
            
            // store cohorts (used to populate the cohort selector for this school)
            setCohorts(cohortsData || []); 
            
            // Store cohort aggregates for fast cohort switching
            setCohortAggregates(millenniumFalcon.cohortAggregate || []);
            setCohortCurriculumAggregates(millenniumFalcon.cohortCurriculumAggregate || []);
            setCohortCollectionAggregates(millenniumFalcon.cohortCollectionAggregate || []);
            setCohortCourseAggregates(millenniumFalcon.cohortCourseAggregate || []);
            setCohortChapterAggregates(millenniumFalcon.cohortChapterAggregate || []);
            setCohortStudentAggregates(millenniumFalcon.cohortStudentAggregate || []);

            const studentsForSelector: Student[] = (millenniumFalcon.schoolStudentAggregate || []).map((studentAgg: any) => ({
              id: studentAgg.student_id,
              student_email: studentAgg.student_email || '',
              student_first: studentAgg.student_first || '',
              student_last: studentAgg.student_last || '',
              school_id: studentAgg.school_id
            }));

            // store all students for student selector, to be filtered based on cohort selection
            setStudentsForSelector(studentsForSelector);
            
            
            // Lazy loading temporarily disabled to prevent performance issues
            // startLazyLoading(schoolId).catch(error => {
            //   console.error('❌ Background lazy loading failed:', error);
            //   // Don't set error state since this is background work
            // });
            
          } catch (dataError: any) {
            // This is the catch to the inner try, loading fresh data if not skipped because of cache
            if (process.env.NODE_ENV === 'development') {
              console.error('❌ Error loading school data:', dataError);
            }
            setError(`Failed to load school data: ${dataError.message}`);
            throw dataError; // Re-throw to be caught by outer catch
          } 
          //================
          // If cache was true, 
          // Skip to here 
          //=====================
        }; // this closes the "else" of the cache check

  // ================================================================================
  // STEP 3: HANDLE CURRICULUM FILTERS
  // ================================================================================
  const handleCurriculumSelection = async (curriculumId: number | null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📚 Curriculum selection changed:', { from: selectedCurriculumId, to: curriculumId });
    }
    setSelectedCurriculumId(curriculumId);
    // Clear downstream selections when curriculum changes
    setSelectedCollectionId(null);
    setSelectedCourseId(null);
    setSelectedChapterId(null);
  }
  
  const handleCollectionSelection = async (collectionId: number | null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📁 Collection selection changed:', { from: selectedCollectionId, to: collectionId });
    }
    setSelectedCollectionId(collectionId);
    // Clear downstream selections when collection changes
    setSelectedCourseId(null);
    setSelectedChapterId(null);
  }
  
  const handleCourseSelection = async (courseId: number | null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📖 Course selection changed:', { from: selectedCourseId, to: courseId });
    }
    setSelectedCourseId(courseId);
    // Clear downstream selections when course changes
    setSelectedChapterId(null);
  }
  
  const handleChapterSelection = async (chapterId: number | null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📄 Chapter selection changed:', { from: selectedChapterId, to: chapterId });
    }
    setSelectedChapterId(chapterId);
  }

  // ================================================================================
  // STEP 3.5: HANDLE COHORT SELECTION - Critical filtering logic
  // ================================================================================
  // 
  // PURPOSE: This function manages the transition between school-wide and cohort-specific views.
  // It's a critical piece of the data flow that affects both the student selector and the ProgressChart.
  // 
  // BEHAVIOR:
  // 1. When a cohort is selected:
  //    - Filter studentsForSelector to show only students in that cohort
  //    - Clear any selected student (cohort change invalidates individual student view)
  //    - ProgressChart will automatically switch to cohort aggregates via currentAggregate
  // 
  // 2. When a cohort is deselected:
  //    - Reset studentsForSelector to show all students in the school
  //    - Clear any selected student
  //    - ProgressChart will automatically switch to school aggregates via currentAggregate
  // 
  // PERFORMANCE: This uses pre-loaded cohort data from the school selection.
  // No additional API calls are needed for cohort switching.
  // 
  // DATA SOURCE: Uses cohortStudentAggregates which contains students with cohort_id,
  // allowing us to filter students by cohort without additional database queries.
  // 
  const handleCohortSelection = async (cohortId: number | null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 Cohort selection changed:', { from: selectedCohortId, to: cohortId });
    }
    
    if (!cohortId) {
      // Handle cohort deselection - clear cohort and student data, show school aggregate
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Cohort deselected, clearing student data and showing school aggregate');
      }
      setSelectedCohortId(null);
      setSelectedStudentId(null);
      setIndividualStudentData(null);
      
      // Reset students for selector to school-wide students
      if (selectedSchoolId && studentAggregates.length > 0) {
        const studentsForSelector: Student[] = studentAggregates.map(studentAgg => ({
          id: studentAgg.student_id,
          student_email: studentAgg.student_email || '',
          student_first: studentAgg.student_first || '',
          student_last: studentAgg.student_last || '',
          school_id: studentAgg.school_id
        }));
        setStudentsForSelector(studentsForSelector);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Reset students for selector to school-wide students:', studentsForSelector.length);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Cannot reset students - no school selected or no student aggregates available');
        }
      }
      return;
    }

    // Handle cohort selection - use pre-loaded cohort data (no API call needed!)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Cohort selected, using pre-loaded cohort data for cohort:', cohortId);
    }
    setSelectedCohortId(cohortId);
    setSelectedStudentId(null);
    setIndividualStudentData(null);
    
    // Filter cohort aggregates to show only the selected cohort
    const selectedCohortAggregates = cohortAggregates.filter(agg => agg.cohort_id === cohortId);
    const selectedCohortCurriculumAggregates = cohortCurriculumAggregates.filter(agg => agg.cohort_id === cohortId);
    const selectedCohortCollectionAggregates = cohortCollectionAggregates.filter(agg => agg.cohort_id === cohortId);
    const selectedCohortCourseAggregates = cohortCourseAggregates.filter(agg => agg.cohort_id === cohortId);
    const selectedCohortChapterAggregates = cohortChapterAggregates.filter(agg => agg.cohort_id === cohortId);
    const selectedCohortStudentAggregates = cohortStudentAggregates.filter(agg => agg.cohort_id === cohortId);
    
    // Update students for selector to show only cohort students
    const cohortStudentsForSelector: Student[] = selectedCohortStudentAggregates.map((studentAgg: any) => ({
      id: studentAgg.student_id,
      student_email: studentAgg.student_email || '',
      student_first: studentAgg.student_first || '',
      student_last: studentAgg.student_last || '',
      school_id: studentAgg.school_id
    }));
    setStudentsForSelector(cohortStudentsForSelector);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Cohort data filtered for cohort:', cohortId, {
        cohortAggregates: selectedCohortAggregates.length,
        students: cohortStudentsForSelector.length
      });
    }
  }

  // ================================================================================
  // STEP 4: LOAD INDIVIDUAL STUDENT DATA WHEN STUDENT SELECTED
  // ================================================================================
  // 
  // PURPOSE: This function switches the application from aggregate view to individual student view.
  // It's the bridge between the high-level aggregate data and detailed individual analysis.
  // 
  // DATA FLOW TRANSITION:
  // 1. Before student selection: ProgressChart shows aggregate data (school/cohort level)
  // 2. After student selection: ProgressChart shows individual student metrics
  // 3. The calculatedStudentMetrics useMemo automatically calculates the new metrics
  // 4. The currentAggregate useMemo automatically switches to use calculatedStudentMetrics
  // 
  // PERFORMANCE CONSIDERATIONS:
  // - Individual student data is loaded on-demand (not pre-loaded like aggregates)
  // - This prevents loading massive amounts of data for students that aren't viewed
  // - The API call can take 1-3 seconds depending on the student's data volume
  // - Loading state is shown to the user during the transition
  // 
  // DATA SOURCE: /api/student-data endpoint which queries:
  // - student_progress_optimized table for lesson completion records
  // - Joins with curriculum hierarchy tables for lesson metadata
  // - Returns raw lesson records with completion dates, requirements, etc.
  // 
  // IMPORTANT: This is the only place where we load individual lesson records.
  // All other data comes from pre-calculated materialized views for performance.
  // 
  const handleStudentSelection = async (studentId: number | null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Student selection triggered:', { 
        studentId, 
        selectedSchoolId 
      });
    }
    
    if (!studentId) {
        // Handle deselection - clear student data
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Student deselection - clearing student data');
        }
        setSelectedStudentId(null);
        setIndividualStudentData(null);
        return;
      }
    
    try {
        setStudentLoading(true);
        setError(null);
        setSelectedStudentId(studentId);

        // Cache logic temporarily disabled - always fetch from server
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Loading student data from server:', studentId);
        }
        const individualStudentData = await ApiService.getIndividualStudentData(studentId);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Server data loaded for student:', studentId, `(${individualStudentData.length} lessons)`);
        }
        setIndividualStudentData(individualStudentData);
        
    } catch (err: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Failed to load student data:', err);
        }
        setError(`Failed to load student data: ${err.message}`);
    } finally {
        setStudentLoading(false);
    }
  };



  // ================================================================================
  // RENDER THE UI
  // ================================================================================
  
  // Only log state in development and when it actually changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏫 Schools for selector:', schools.length);
      console.log('👥 Students for selector:', studentsForSelector.length);
      console.log('👥 Students state:', students.length);
      console.log('🎓 Cohorts state:', cohorts.length);
      console.log('📊 Student aggregates count:', studentAggregates.length);
      console.log('📊 Cohort student aggregates count:', cohortStudentAggregates.length);
      console.log('🎯 Current selections:', {
        school: selectedSchoolId,
        cohort: selectedCohortId,
        student: selectedStudentId
      });
      console.log('🔄 Loading state:', loading);
      console.log('❌ Error state:', error);
      
    }
  }, [
    schools.length,
    studentsForSelector.length,
    students.length,
    cohorts.length,
    studentAggregates.length,
    cohortStudentAggregates.length,
    selectedSchoolId,
    selectedCohortId,
    selectedStudentId,
    loading,
    error,
    
  ]);
  

  
  // ================================================================================
  // CURRENT AGGREGATE - The heart of the data flow logic
  // ================================================================================
  // 
  // PURPOSE: This is the single most important piece of logic in the application.
  // It determines what data to show in the ProgressChart based on the current state.
  // 
  // DECISION TREE:
  // 1. If a student is selected → Use calculatedStudentMetrics (individual data)
  // 2. If a cohort is selected → Use cohort-specific aggregates
  // 3. If curriculum filters are applied → Use filtered aggregates
  // 4. Otherwise → Use school-wide aggregates
  // 
  // DATA SOURCES:
  // - calculatedStudentMetrics: Real-time calculations from individual student data
  // - cohortAggregates: Pre-calculated metrics for specific cohorts
  // - schoolAggregates: Pre-calculated metrics for entire schools
  // - Various curriculum aggregates: Filtered by curriculum hierarchy
  // 
  // PERFORMANCE: This is memoized to prevent unnecessary recalculations.
  // It only recalculates when any of its dependencies change.
  // 
  // IMPORTANT: This logic ensures that the ProgressChart always shows the correct
  // data for the current selection state, whether it's school-wide, cohort-specific,
  // curriculum-filtered, or individual student data.
  // 
  const currentAggregate = useMemo(() => {
    // Only log in development and when dependencies actually change
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 currentAggregate useMemo triggered:', {
        selectedStudentId,
        selectedCohortId,
        selectedCurriculumId,
        selectedCollectionId,
        selectedCourseId,
        selectedChapterId,
        hasCalculatedStudentMetrics: !!calculatedStudentMetrics,
        schoolAggregatesLength: schoolAggregates.length,
        cohortAggregatesLength: cohortAggregates.length
      });
    }

    // If student is selected, use calculated student metrics
    if (selectedStudentId && calculatedStudentMetrics) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Using calculated student metrics');
      }
      return calculatedStudentMetrics;
    }

    // Determine which aggregate data to use (cohort vs school)
    const useCohortData = selectedCohortId && cohortAggregates.length > 0;
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Aggregate data source:', useCohortData ? 'cohort' : 'school');
    }
    
    // Get the appropriate aggregate data based on current filters
    let aggregateData = null;
    let title = '';

    if (selectedChapterId) {
      // Chapter level filter
      const data = useCohortData 
        ? cohortChapterAggregates.find(c => c.chapter_id === selectedChapterId)
        : chapterAggregates.find(c => c.chapter_id === selectedChapterId);
      
      if (data) {
        aggregateData = data;
        title = `Chapter: ${data.chapter_name}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found chapter aggregate data:', data.chapter_name);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('❌ No chapter aggregate data found for ID:', selectedChapterId);
      }
    } else if (selectedCourseId) {
      // Course level filter
      const data = useCohortData 
        ? cohortCourseAggregates.find(c => c.course_id === selectedCourseId)
        : courseAggregates.find(c => c.course_id === selectedCourseId);
      
      if (data) {
        aggregateData = data;
        title = `Course: ${data.course_name}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found course aggregate data:', data.course_name);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('❌ No course aggregate data found for ID:', selectedCourseId);
      }
    } else if (selectedCollectionId) {
      // Collection level filter
      const data = useCohortData 
        ? cohortCollectionAggregates.find(c => c.collection_id === selectedCollectionId)
        : collectionAggregates.find(c => c.collection_id === selectedCollectionId);
      
      if (data) {
        aggregateData = data;
        title = `Collection: ${data.collection_name}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found collection aggregate data:', data.collection_name);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('❌ No collection aggregate data found for ID:', selectedCollectionId);
      }
    } else if (selectedCurriculumId) {
      // Curriculum level filter
      const data = useCohortData 
        ? cohortCurriculumAggregates.find(c => c.curriculum_id === selectedCurriculumId)
        : curriculumAggregates.find(c => c.curriculum_id === selectedCurriculumId);
      
      if (data) {
        aggregateData = data;
        title = `Curriculum: ${data.curriculum_name}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found curriculum aggregate data:', data.curriculum_name);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('❌ No curriculum aggregate data found for ID:', selectedCurriculumId);
      }
    } else {
      // School/Cohort level (no curriculum filters applied)
      const data = useCohortData 
        ? cohortAggregates.find(agg => agg.cohort_id === selectedCohortId)
        : schoolAggregates[0];
      
      if (data) {
        aggregateData = data;
        title = useCohortData 
          ? `Cohort: ${data.cohort_name}` 
          : `School: ${data.school_name}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Found school/cohort aggregate data:', title);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log('❌ No school/cohort aggregate data found');
      }
    }

    // Return formatted data for ProgressChart
    if (aggregateData) {
      const result = {
        totalLessons: aggregateData.total_lessons_expected || 0,
        totalCompleted: aggregateData.total_lessons_completed || 0,
        requiredLessons: aggregateData.required_lessons_expected || 0,
        requiredCompleted: aggregateData.required_lessons_completed || 0,
        title
      };
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Returning aggregate data:', result);
      }
      return result;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ No aggregate data found, returning null');
    }
    return null;
  }, [
    selectedStudentId,
    calculatedStudentMetrics,
    selectedCohortId,
    cohortAggregates,
    cohortCurriculumAggregates,
    cohortCollectionAggregates,
    cohortCourseAggregates,
    cohortChapterAggregates,
    schoolAggregates,
    curriculumAggregates,
    collectionAggregates,
    courseAggregates,
    chapterAggregates,
    selectedChapterId,
    selectedCourseId,
    selectedCollectionId,
    selectedCurriculumId
  ]);

  // Determine which aggregates to use for CurriculumFilters
  const useCohortAggregates = selectedCohortId && cohortAggregates.length > 0;
  const activeAggregates = useCohortAggregates
    ? {
        curriculumAggregates: cohortCurriculumAggregates,
        collectionAggregates: cohortCollectionAggregates,
        courseAggregates: cohortCourseAggregates,
        chapterAggregates: cohortChapterAggregates,
      }
    : {
        curriculumAggregates,
        collectionAggregates,
        courseAggregates,
        chapterAggregates,
      };

  // Only log curriculum filters in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('CurriculumFilters: collections', activeAggregates.collectionAggregates.length);
      console.log('CurriculumFilters: courses', activeAggregates.courseAggregates.length);
      console.log('CurriculumFilters: chapters', activeAggregates.chapterAggregates.length);
    }
  }, [activeAggregates.collectionAggregates.length, activeAggregates.courseAggregates.length, activeAggregates.chapterAggregates.length]);

  // Only log ProgressChart props in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Rendering ProgressChart with:', {
        aggregateData: currentAggregate,
        loading,
        error,
        hasIndividualData: !!individualStudentData
      });
    }
  }, [currentAggregate, loading, error, individualStudentData]);

  // ================================================================================
  // RENDER LOGIC
  // ================================================================================
  
  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginForm 
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleLoginError}
      />
    );
  }

  // Show main app if authenticated
  return (
    <div className="w-full min-h-screen bg-gray-50"> {/* AppWrapper: full width, background */}
      <div className="max-w-[1600px] mx-auto px-5 py-6"> {/* App content: centered, max 1600px */}
        {/* Row 1: Header with User Info and Logout */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {currentUser && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{currentUser.first_name} {currentUser.last_name}</span>
                <span className="mx-2">•</span>
                <span>{currentUser.school_name}</span>
                <span className="mx-2">•</span>
                <span className="capitalize">{currentUser.role}</span>
                {currentUser.id === -1 && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    🚀 SUPAADMIN MODE
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Row 2: Error/Message Bar */}
        <div className="mb-4 min-h-[48px] flex items-center">
          {error ? (
            <div className="text-red-600 bg-red-50 px-4 py-2 rounded-md">{error}</div>
          ) : null}
          {authError ? (
            <div className="text-red-600 bg-red-50 px-4 py-2 rounded-md">{authError}</div>
          ) : null}
        </div>

        {/* Row 2: School Selector */}
        <div className="mb-4">
          <SchoolSelector
            schools={schools}
            selectedSchoolId={selectedSchoolId}
            onSchoolSelect={handleSchoolSelection}
          />
        </div>

        {/* Row 3: Cohort + Student Selectors */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <CohortSelector
              cohorts={cohorts}
              selectedCohortId={selectedCohortId}
              onCohortSelect={handleCohortSelection}
              disabled={!selectedSchoolId}
            />
          </div>
          <div className="flex-1">
            <div className="relative">
              <StudentSelector
                students={studentsForSelector}
                selectedStudentId={selectedStudentId}
                onStudentSelect={handleStudentSelection}
                disabled={!selectedSchoolId}
              />
              {/* Data Loading Indicator */}
              {selectedSchoolId && (
                <div className="hidden">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    ✅ Local Data
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Curriculum Filters */}
        <div className="mb-4">
          <CurriculumFilters 
              selectedCurriculumId={selectedCurriculumId}
              selectedCollectionId={selectedCollectionId}
              selectedCourseId={selectedCourseId}
              selectedChapterId={selectedChapterId}
              onCurriculumSelect={handleCurriculumSelection}
              onCollectionSelect={handleCollectionSelection}
              onCourseSelect={handleCourseSelection}
              onChapterSelect={handleChapterSelection}
              hierarchyData={curriculumHierarchy}
              collectionAggregates={
                selectedStudentId && perStudentAggregates
                  ? perStudentAggregates.collectionAggregates
                  : activeAggregates.collectionAggregates
              }
              courseAggregates={
                selectedStudentId && perStudentAggregates
                  ? perStudentAggregates.courseAggregates
                  : activeAggregates.courseAggregates
              }
              chapterAggregates={
                selectedStudentId && perStudentAggregates
                  ? perStudentAggregates.chapterAggregates
                  : activeAggregates.chapterAggregates
              }
            />
        </div>

        {/* Row 5: Main Data Area */}
        <div>
          <ProgressChart 
            currentAggregate={currentAggregate}
            individualStudentData={individualStudentData}
            calculatedStudentMetrics={calculatedStudentMetrics}
            selectedStudentId={selectedStudentId}
            selectedCurriculumId={selectedCurriculumId}
            selectedCollectionId={selectedCollectionId}
            selectedCourseId={selectedCourseId}
            selectedChapterId={selectedChapterId}
          />      
        </div>
      </div>
      
              {/* Debug Tools - Only visible to supaadmin */}
        {currentUser && currentUser.id === -1 && currentUser.role === 'supaadmin' && (
          <>
            {/* Debug Tool - Faculty Impersonation */}
            <FacultyImpersonationDebug 
              currentUser={currentUser}
              onUserChange={handleUserChange}
              progressDebugData={{
                mode: selectedStudentId ? 'student' : selectedCohortId ? 'cohort' : 'school',
                selectedSchoolId,
                selectedStudentId,
                selectedCurriculumId,
                selectedCollectionId,
                selectedCourseId,
                selectedChapterId,
                lessonCount: selectedStudentId && individualStudentData ? 
                  (Array.isArray(individualStudentData) ? individualStudentData.length : 0) : 0
              }}
            />

            {/* Data Loading Status */}
            <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Data Status</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Student Data Cache:</span>
                  <span className={
                    'text-red-600 font-medium'
                  }>
                    {'❌ None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Status:</span>

                </div>

                <div className="flex justify-between">
                </div>
              </div>
            </div>
          </>
        )}

        {/* Lazy Loading Progress Modal - Only show for non-supaadmin users */}
        {(!currentUser || currentUser.id !== -1 || currentUser.role !== 'supaadmin') && (
          <LazyLoadProgressComponent 
            progress={null}
            onCancel={() => {}}
          />
        )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <FacultyProvider>
      <AppContent />
    </FacultyProvider>
  );
};

export default App;