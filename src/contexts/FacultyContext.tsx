import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FacultyMember {
  id: number;
  student_email: string;
  student_first: string;
  student_last: string;
  school_id: number;
  school_name: string;
}

interface FacultyContextType {
  // Current faculty member (null if not impersonating/not logged in)
  currentFaculty: FacultyMember | null;
  
  // Impersonation methods (for debug/development)
  impersonateFaculty: (faculty: FacultyMember | null) => void;
  
  // Real authentication methods (for future implementation)
  loginAsFaculty: (email: string, password: string) => Promise<boolean>;
  logoutFaculty: () => void;
  
  // Utility methods
  isFacultyLoggedIn: boolean;
  getFacultySchoolId: () => number | null;
}

const FacultyContext = createContext<FacultyContextType | undefined>(undefined);

interface FacultyProviderProps {
  children: ReactNode;
}

export const FacultyProvider: React.FC<FacultyProviderProps> = ({ children }) => {
  const [currentFaculty, setCurrentFaculty] = useState<FacultyMember | null>(null);

  const impersonateFaculty = (faculty: FacultyMember | null) => {
    console.log('🔧 Faculty impersonation:', faculty ? `Logged in as ${faculty.student_email} (${faculty.school_name})` : 'Logged out');
    setCurrentFaculty(faculty);
  };

  const loginAsFaculty = async (email: string, password: string): Promise<boolean> => {
    // TODO: Implement real authentication
    // This will be replaced with actual login logic
    console.log('🔐 Real faculty login not yet implemented');
    return false;
  };

  const logoutFaculty = () => {
    console.log('🔐 Faculty logout');
    setCurrentFaculty(null);
  };

  const isFacultyLoggedIn = currentFaculty !== null;

  const getFacultySchoolId = (): number | null => {
    return currentFaculty?.school_id || null;
  };

  const value: FacultyContextType = {
    currentFaculty,
    impersonateFaculty,
    loginAsFaculty,
    logoutFaculty,
    isFacultyLoggedIn,
    getFacultySchoolId,
  };

  return (
    <FacultyContext.Provider value={value}>
      {children}
    </FacultyContext.Provider>
  );
};

export const useFaculty = (): FacultyContextType => {
  const context = useContext(FacultyContext);
  if (context === undefined) {
    throw new Error('useFaculty must be used within a FacultyProvider');
  }
  return context;
}; 