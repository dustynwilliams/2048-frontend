/**
 * FacultyImpersonationDebug Component
 * 
 * Simple debug tool for development - allows switching between different user roles
 * without complex authentication
 */

import React, { useState } from 'react';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  school_id: number;
  role: string;
  school_name?: string;
  can_access_all_schools?: boolean;
}

interface ProgressDebugData {
  mode: 'student' | 'cohort' | 'school';
  selectedSchoolId: number | null;
  selectedStudentId: number | null;
  selectedCurriculumId: number | null;
  selectedCollectionId: number | null;
  selectedCourseId: number | null;
  selectedChapterId: number | null;
  lessonCount: number;
}

interface FacultyImpersonationDebugProps {
  currentUser: User;
  onUserChange: (user: User | null) => void;
  progressDebugData: ProgressDebugData;
}

const FacultyImpersonationDebug: React.FC<FacultyImpersonationDebugProps> = ({
  currentUser,
  onUserChange,
  progressDebugData
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const presetUsers: User[] = [
    {
      id: -1,
      email: 'supaadmin',
      first_name: 'Super',
      last_name: 'Admin',
      school_id: 1,
      role: 'supaadmin',
      school_name: 'All Schools',
      can_access_all_schools: true
    },
    {
      id: 1,
      email: 'guest@example.com',
      first_name: 'Guest',
      last_name: 'User',
      school_id: 1,
      role: 'guest',
      school_name: 'Example School',
      can_access_all_schools: false
    },
    {
      id: 2,
      email: 'faculty@school.edu',
      first_name: 'Faculty',
      last_name: 'Member',
      school_id: 1,
      role: 'faculty',
      school_name: 'Example School',
      can_access_all_schools: false
    }
  ];

  const handleUserSwitch = (user: User) => {
    onUserChange(user);
    console.log('🔧 Switched to user:', user.email);
  };

  const handleLogout = () => {
    onUserChange(null);
    console.log('🔐 Logged out');
  };

  return (
    <>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors z-50"
      >
        🔧 Debug
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900">Debug Tools</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Current User Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Current User</h4>
            <div className="text-xs text-gray-600">
              <div><strong>Name:</strong> {currentUser.first_name} {currentUser.last_name}</div>
              <div><strong>Email:</strong> {currentUser.email}</div>
              <div><strong>Role:</strong> {currentUser.role}</div>
              <div><strong>School ID:</strong> {currentUser.school_id}</div>
            </div>
          </div>

          {/* User Switching */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Switch User</h4>
            <div className="space-y-2">
              {presetUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSwitch(user)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                    currentUser.id === user.id
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-medium">{user.first_name} {user.last_name}</div>
                  <div className="text-gray-500">{user.email} ({user.role})</div>
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Logout
          </button>

          {/* Progress Debug Data */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <h4 className="text-xs font-medium text-blue-700 mb-2">Progress Debug</h4>
            <div className="text-xs text-blue-600 space-y-1">
              <div><strong>Mode:</strong> {progressDebugData.mode}</div>
              <div><strong>School:</strong> {progressDebugData.selectedSchoolId || 'None'}</div>
              <div><strong>Student:</strong> {progressDebugData.selectedStudentId || 'None'}</div>
              <div><strong>Curriculum:</strong> {progressDebugData.selectedCurriculumId || 'None'}</div>
              <div><strong>Collection:</strong> {progressDebugData.selectedCollectionId || 'None'}</div>
              <div><strong>Course:</strong> {progressDebugData.selectedCourseId || 'None'}</div>
              <div><strong>Chapter:</strong> {progressDebugData.selectedChapterId || 'None'}</div>
              <div><strong>Lessons:</strong> {progressDebugData.lessonCount}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FacultyImpersonationDebug; 