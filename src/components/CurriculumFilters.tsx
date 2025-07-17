/**
 * Simple CurriculumFilters Component for Reality App
 */

import React from 'react';

interface CurriculumFiltersProps {
  selectedCurriculumId: number | null;
  selectedCollectionId: number | null;
  selectedCourseId: number | null;
  selectedChapterId: number | null;
  onCurriculumSelect: (curriculumId: number | null) => void;
  onCollectionSelect: (collectionId: number | null) => void;
  onCourseSelect: (courseId: number | null) => void;
  onChapterSelect: (chapterId: number | null) => void;
  hierarchyData: any; // The curriculum hierarchy data
  collectionAggregates?: any[];
  courseAggregates?: any[];
  chapterAggregates?: any[];
}

const CurriculumFilters: React.FC<CurriculumFiltersProps> = ({
  selectedCurriculumId,
  selectedCollectionId,
  selectedCourseId,
  selectedChapterId,
  onCurriculumSelect,
  onCollectionSelect,
  onCourseSelect,
  onChapterSelect,
  hierarchyData,
  collectionAggregates = [],
  courseAggregates = [],
  chapterAggregates = [],
}) => {
  // Debug logging
  console.log('🔍 CurriculumFilters received props:', {
    hierarchyData: hierarchyData,
    hierarchyDataType: typeof hierarchyData,
    hierarchyDataLength: hierarchyData?.length || 0,
    selectedCurriculumId,
    selectedCollectionId,
    selectedCourseId,
    selectedChapterId,
    collectionAggregatesLength: collectionAggregates.length,
    courseAggregatesLength: courseAggregates.length,
    chapterAggregatesLength: chapterAggregates.length
  });

  // Handle loading state
  if (!hierarchyData || hierarchyData.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">
            {!hierarchyData ? 'Loading curriculum hierarchy...' : 'No curriculum data available'}
          </p>
        </div>
      </div>
    );
  }

  // Extract unique values from the flat hierarchy array
  const curricula = hierarchyData ? 
    [...new Map(hierarchyData.map((item: any) => [item.curriculum_id, item])).values()] : [];
  
  const collections = hierarchyData ? 
    [...new Map(hierarchyData
      .filter((item: any) => !selectedCurriculumId || item.curriculum_id === selectedCurriculumId)
      .map((item: any) => [item.collection_id, item])).values()] : [];
  
  const courses = hierarchyData ? 
    [...new Map(hierarchyData
      .filter((item: any) => !selectedCollectionId || item.collection_id === selectedCollectionId)
      .map((item: any) => [item.course_id, item])).values()] : [];
  
  const chapters = hierarchyData ? 
    [...new Map(hierarchyData
      .filter((item: any) => !selectedCourseId || item.course_id === selectedCourseId)
      .map((item: any) => [item.chapter_id, item])).values()] : [];

  // Debug logging for extracted data
  console.log('🔍 CurriculumFilters extracted data:', {
    curriculaCount: curricula.length,
    collectionsCount: collections.length,
    coursesCount: courses.length,
    chaptersCount: chapters.length,
    sampleCurriculum: curricula[0],
    sampleCollection: collections[0],
    sampleCourse: courses[0],
    sampleChapter: chapters[0]
  });

  // Helper functions to get total_completed for each entity
  const getCollectionCompleted = (collection_id: number) => {
    const agg = collectionAggregates.find((a: any) => a.collection_id === collection_id);
    return agg ? agg.total_lessons_completed : 0;
  };
  const getCourseCompleted = (course_id: number) => {
    const agg = courseAggregates.find((a: any) => a.course_id === course_id);
    return agg ? agg.total_lessons_completed : 0;
  };
  const getChapterCompleted = (chapter_id: number) => {
    const agg = chapterAggregates.find((a: any) => a.chapter_id === chapter_id);
    return agg ? agg.total_lessons_completed : 0;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Curriculum Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 1. Curriculum Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Curriculum
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedCurriculumId || ''}
            onChange={(e) => {
              const value = e.target.value;
              onCurriculumSelect(value ? parseInt(value) : null);
            }}
            autoComplete="off"
          >
            <option value="">Select Curriculum</option>
            {curricula.map((curriculum: any) => (
              <option key={curriculum.curriculum_id} value={curriculum.curriculum_id}>
                {curriculum.curriculum_name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Collection Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Collection
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedCollectionId || ''}
            onChange={(e) => {
              const value = e.target.value;
              onCollectionSelect(value ? parseInt(value) : null);
            }}
            disabled={!selectedCurriculumId}
            autoComplete="off"
          >
            <option value="">Select Collection</option>
            {collections.map((collection: any) => (
              <option key={collection.collection_id} value={collection.collection_id}>
                {collection.collection_name} ({getCollectionCompleted(collection.collection_id)})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Course Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedCourseId || ''}
            onChange={(e) => {
              const value = e.target.value;
              onCourseSelect(value ? parseInt(value) : null);
            }}
            disabled={!selectedCollectionId}
            autoComplete="off"
          >
            <option value="">Select Course</option>
            {courses.map((course: any) => (
              <option key={course.course_id} value={course.course_id}>
                {course.course_name} ({getCourseCompleted(course.course_id)})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Chapter Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chapter
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedChapterId || ''}
            onChange={(e) => {
              const value = e.target.value;
              onChapterSelect(value ? parseInt(value) : null);
            }}
            disabled={!selectedCourseId}
            autoComplete="off"
          >
            <option value="">Select Chapter</option>
            {chapters.map((chapter: any) => (
              <option key={chapter.chapter_id} value={chapter.chapter_id}>
                {chapter.chapter_name} ({getChapterCompleted(chapter.chapter_id)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>Selected: Curriculum {selectedCurriculumId} → Collection {selectedCollectionId} → Course {selectedCourseId} → Chapter {selectedChapterId}</p>
      </div>
    </div>
  );
};

export default CurriculumFilters;
