/**
 * LazyLoadProgress Component
 * 
 * Displays progress for lazy loading of school data with visual feedback
 * and status updates for the user.
 */

import React from 'react';
import { LazyLoadProgress as ProgressType } from '../services/DataCacheService';

interface LazyLoadProgressProps {
  progress: ProgressType | null;
  onCancel?: () => void;
}

const LazyLoadProgress: React.FC<LazyLoadProgressProps> = ({ progress, onCancel }) => {
  console.log('🎯 LazyLoadProgress render:', progress);
  if (!progress) return null;

  const percentage = progress.totalStudents > 0 
    ? Math.round((progress.loadedStudents / progress.totalStudents) * 100) 
    : 0;

  const getStatusMessage = () => {
    if (progress.error) {
      return `Error: ${progress.error}`;
    }
    
    if (progress.isComplete) {
      return `✅ Loaded ${progress.loadedStudents} students successfully`;
    }
    
    if (progress.currentStudent) {
      return `Loading student: ${progress.currentStudent} (${progress.loadedStudents}/${progress.totalStudents})`;
    }
    
    return `Preparing to load ${progress.totalStudents} students...`;
  };

  const getProgressColor = () => {
    if (progress.error) return 'bg-red-500';
    if (progress.isComplete) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Loading School Data
          </h3>
          {onCancel && !progress.isComplete && !progress.error && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="mb-4">
          <p className={`text-sm ${
            progress.error ? 'text-red-600' : 
            progress.isComplete ? 'text-green-600' : 
            'text-gray-700'
          }`}>
            {getStatusMessage()}
          </p>
        </div>

        {/* Details */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>School ID:</span>
            <span>{progress.schoolId}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Students:</span>
            <span>{progress.totalStudents}</span>
          </div>
          <div className="flex justify-between">
            <span>Loaded Students:</span>
            <span>{progress.loadedStudents}</span>
          </div>
        </div>

        {/* Action Buttons */}
        {progress.isComplete && !progress.error && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        )}

        {progress.error && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LazyLoadProgress; 