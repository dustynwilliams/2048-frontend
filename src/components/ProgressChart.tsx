/**
 * PROGRESSCHART COMPONENT - The Visual Data Display Engine
 * 
 * PURPOSE: This component is responsible for displaying progress metrics and lesson data
 * in a user-friendly format. It's the final destination in the data flow pipeline.
 * 
 * ARCHITECTURE: This is a "dumb" component that receives all data as props from App.tsx.
 * It doesn't manage its own state or make API calls. This makes it predictable and testable.
 * 
 * DATA FLOW:
 * 1. App.tsx calculates currentAggregate or calculatedStudentMetrics
 * 2. ProgressChart receives the data as props
 * 3. ProgressChart displays the data in metric cards and/or table format
 * 4. User can toggle between summary view and detailed table view
 * 
 * PERFORMANCE OPTIMIZATION: 
 * - Uses memoization for expensive data processing operations
 * - Receives pre-calculated data instead of calculating on-the-fly
 * - Efficient filtering of individual student data for table view
 * 
 * TWO DISPLAY MODES:
 * 1. Summary View: Shows metric cards with completion percentages
 * 2. Table View: Shows detailed lesson-by-lesson breakdown (only for individual students)
 * 
 * DATA SOURCES:
 * - currentAggregate: Pre-calculated metrics from materialized views (school/cohort level)
 * - calculatedStudentMetrics: Real-time calculations from individual student data
 * - individualStudentData: Raw lesson records for table view (only when student selected)
 * 
 * IMPORTANT: This component never makes API calls or manages state.
 * All data comes from App.tsx, ensuring consistency across the application.
 */

import React, { useState, useMemo } from 'react';
import { 
  SchoolAggregate, 
  CurriculumAggregate, 
  CollectionAggregate, 
  CourseAggregate, 
  ChapterAggregate, 
  StudentAggregate,
  IndividualStudentData,
  Lesson 
} from './ProgressTypes';

interface ProgressChartProps {
  // ================================================================================
  // PROPS INTERFACE - All data comes from App.tsx
  // ================================================================================
  
  // Current aggregate data (pre-calculated by App.tsx from materialized views)
  // This contains school-wide or cohort-specific metrics
  // Format: { totalLessons, totalCompleted, requiredLessons, requiredCompleted, title }
  currentAggregate: {
    totalLessons: number;
    totalCompleted: number;
    requiredLessons: number;
    requiredCompleted: number;
    title: string;
  } | null;
  
  // Individual student data (raw lesson records for table view)
  // This is only populated when a student is selected
  // Contains detailed lesson-by-lesson completion data
  individualStudentData: any[] | null;
  
  // Calculated student metrics (real-time calculations from individualStudentData)
  // This takes precedence over currentAggregate when a student is selected
  // Format: { totalLessons, totalCompleted, requiredLessons, requiredCompleted, title }
  calculatedStudentMetrics: {
    totalLessons: number;
    totalCompleted: number;
    requiredLessons: number;
    requiredCompleted: number;
    title: string;
  } | null;
  
  // Filter state (used for filtering individualStudentData in table view)
  // These come from the curriculum filters in App.tsx
  selectedStudentId: number | null;
  selectedCurriculumId: number | null;
  selectedCollectionId: number | null;
  selectedCourseId: number | null;
  selectedChapterId: number | null;
}

// Helper component for metric cards
const MetricCard: React.FC<{
  title: string;
  value: number;
  bgColor: string;
  textColor: string;
}> = ({ title, value, bgColor, textColor }) => (
  <div className={`${bgColor} p-4 rounded-lg border border-gray-200`}>
    <div className={`text-2xl font-bold ${textColor}`}>
      {value.toLocaleString()}
    </div>
    <div className="text-sm text-gray-600 mt-1">
      {title}
    </div>
  </div>
);

// Utility to clean course name for display
function getDisplayCourseName(course_name: string, collection_name?: string) {
  if (collection_name && course_name && course_name.startsWith(collection_name + ': ')) {
    return course_name.slice((collection_name + ': ').length);
  }
  return course_name;
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  currentAggregate,
  individualStudentData,
  calculatedStudentMetrics,
  selectedStudentId,
  selectedCurriculumId,
  selectedCollectionId,
  selectedCourseId,
  selectedChapterId,
}) => {
  // Toggle state for switching between summative and table view
  const [isTableView, setIsTableView] = useState(false);
  // Toggle state for including optional lessons in table view
  const [includeOptionalLessons, setIncludeOptionalLessons] = useState(true);
  
  // Debug logging
  console.log('🔍 ProgressChart Debug:', {
    selectedStudentId,
    individualStudentDataType: Array.isArray(individualStudentData) ? 'array' : typeof individualStudentData,
    individualStudentDataLength: Array.isArray(individualStudentData) ? individualStudentData.length : 'N/A',
    calculatedStudentMetrics,
    currentAggregate,
    selectedFilters: {
      curriculum: selectedCurriculumId,
      collection: selectedCollectionId,
      course: selectedCourseId,
      chapter: selectedChapterId
    }
  });

  // Additional debug logging for state changes
  console.log('🔄 ProgressChart render triggered with:', {
    hasCurrentAggregate: !!currentAggregate,
    hasCalculatedStudentMetrics: !!calculatedStudentMetrics,
    hasIndividualStudentData: !!individualStudentData,
    displayDataTitle: (calculatedStudentMetrics || currentAggregate)?.title || 'No Data'
  });

  // ================================================================================
  // OPTIMIZED DATA PROCESSING - Memoized filtering for performance
  // ================================================================================
  // 
  // PURPOSE: This processes individualStudentData for the table view, applying curriculum filters
  // and optional lesson filtering. It's memoized to prevent unnecessary recalculations.
  // 
  // FILTERING LOGIC:
  // 1. Curriculum hierarchy filters (most specific to least specific):
  //    - Chapter filter: Shows only lessons in the selected chapter
  //    - Course filter: Shows only lessons in the selected course
  //    - Collection filter: Shows only lessons in the selected collection
  //    - Curriculum filter: Shows only lessons in the selected curriculum
  // 
  // 2. Optional lesson filter:
  //    - When unchecked: Shows only required lessons (is_required = true)
  //    - When checked: Shows all lessons (required and optional)
  // 
  // PERFORMANCE: This is memoized to prevent recalculating the filtered data
  // on every render. It only recalculates when the dependencies change.
  // 
  // IMPORTANT: This only processes data when a student is selected.
  // For aggregate views (school/cohort), we use the pre-calculated metrics instead.
  // 
  const processedTableData = useMemo(() => {
    if (!selectedStudentId || !individualStudentData || !Array.isArray(individualStudentData)) {
      return [];
    }

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

    // Filter optional lessons if toggle is unchecked
    if (!includeOptionalLessons) {
      filteredData = filteredData.filter(lesson => lesson.is_required === true);
    }

    return filteredData;
  }, [selectedStudentId, individualStudentData, selectedCurriculumId, selectedCollectionId, selectedCourseId, selectedChapterId, includeOptionalLessons]);

  // ================================================================================
  // DISPLAY DATA CALCULATION - Final data preparation for rendering
  // ================================================================================
  // 
  // PURPOSE: This section determines what data to display and calculates the final metrics
  // that will be shown in the metric cards and progress bars.
  // 
  // DATA PRIORITY (highest to lowest):
  // 1. calculatedStudentMetrics: Individual student data (when student is selected)
  // 2. currentAggregate: Pre-calculated aggregate data (school/cohort level)
  // 3. Fallback: Empty data structure with zeros
  // 
  // WHY THIS PRIORITY:
  // - Individual student data is more specific and should take precedence
  // - Aggregate data provides a broader view when no student is selected
  // - Fallback ensures the component always has valid data to render
  // 
  // PERCENTAGE CALCULATIONS:
  // - totalPercentage: Overall completion rate (completed / total)
  // - requiredPercentage: Required lesson completion rate (required completed / required total)
  // - Both include division by zero protection to prevent NaN values
  // 
  const displayData = calculatedStudentMetrics || currentAggregate || {
    totalLessons: 0,
    totalCompleted: 0,
    requiredLessons: 0,
    requiredCompleted: 0,
    title: "No Data Available"
  };
  
  // Calculate percentages with division by zero protection
  const totalPercentage = displayData.totalLessons > 0 
    ? Math.round((displayData.totalCompleted / displayData.totalLessons) * 100) 
    : 0;
  const requiredPercentage = displayData.requiredLessons > 0 
    ? Math.round((displayData.requiredCompleted / displayData.requiredLessons) * 100) 
    : 0;

  // ================================================================================
  // TABLE VIEW COMPONENT
  // ================================================================================
  
  const TableView: React.FC = () => (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Curriculum
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Collection
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Course
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Chapter
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Lesson
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                Completion Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {processedTableData.map((lesson, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 border-b">
                  {lesson.curriculum_name || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-b">
                  {lesson.collection_name || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-b">
                  {getDisplayCourseName(lesson.course_name, lesson.collection_name) || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-b">
                  {lesson.chapter_name || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-b font-medium">
                  {lesson.lesson_name || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm border-b">
                  {lesson.completion_date ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  ) : lesson.engagement_date ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      In Progress
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Not Started
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 border-b">
                  {lesson.completion_date ? new Date(lesson.completion_date).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ================================================================================
  // RENDER
  // ================================================================================
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{displayData.title}</h2>
        <div className="flex items-center gap-4">
          {/* Toggle Button - Only visible when student is selected */}
          {selectedStudentId && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">View:</span>
                <button
                  onClick={() => setIsTableView(false)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    !isTableView 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setIsTableView(true)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    isTableView 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Table
                </button>
              </div>
              
              {/* Optional Lessons Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  autoComplete="off"
                  id="includeOptionalLessons"
                  checked={includeOptionalLessons}
                  onChange={(e) => setIncludeOptionalLessons(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="includeOptionalLessons" className="text-sm text-gray-600">
                  Include Optional Lessons
                </label>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {!displayData.totalLessons ? (
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-gray-400 text-lg mb-2">📊</div>
            <div className="text-gray-600 font-medium">No Data Available</div>
            <div className="text-gray-500 text-sm mt-1">Select a school to view progress data</div>
          </div>
        </div>
      ) : selectedStudentId && isTableView ? (
        // Table View
        <TableView />
      ) : (
        // Summative View (default)
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Lessons" 
              value={displayData.totalLessons} 
              bgColor="bg-blue-50" 
              textColor="text-blue-600"
            />
            <MetricCard 
              title="Total Completed" 
              value={displayData.totalCompleted} 
              bgColor="bg-green-50" 
              textColor="text-green-600"
            />
            <MetricCard 
              title="Required Lessons" 
              value={displayData.requiredLessons} 
              bgColor="bg-orange-50" 
              textColor="text-orange-600"
            />
            <MetricCard 
              title="Required Completed" 
              value={displayData.requiredCompleted} 
              bgColor="bg-purple-50" 
              textColor="text-purple-600"
            />
          </div>
          
          {/* Show percentages when we have data */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Overall Progress</div>
              <div className="text-lg font-semibold">{totalPercentage}%</div>
              <div className="text-xs text-gray-500">
                {displayData.totalCompleted} of {displayData.totalLessons} lessons
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Required Progress</div>
              <div className="text-lg font-semibold">{requiredPercentage}%</div>
              <div className="text-xs text-gray-500">
                {displayData.requiredCompleted} of {displayData.requiredLessons} required
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProgressChart;