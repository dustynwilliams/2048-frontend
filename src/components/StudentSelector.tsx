/**
 * Simple StudentSelector Component for Reality App
 */

import React from 'react';
import Selector_GenericSingleChoiceSelector from './Selector_GenericSingleChoiceSelector';
import { Student } from './ProgressTypes';

interface StudentSelectorProps {
  students: Student[];
  selectedStudentId: number | null;
  onStudentSelect: (studentId: number | null) => void;
  disabled?: boolean;
}

const StudentSelector: React.FC<StudentSelectorProps> = ({
  students,
  selectedStudentId,
  onStudentSelect,
  disabled
}) => {
  console.log('👨‍🎓 StudentSelector received props:', { 
    studentsCount: students.length, 
    selectedStudentId, 
    disabled,
    firstStudent: students[0]
  });
  
  return (
      <Selector_GenericSingleChoiceSelector
      label="Student Selection"
      options={students
        .slice()
        .sort((a, b) => {
          const lastCmp = a.student_last.localeCompare(b.student_last);
          if (lastCmp !== 0) return lastCmp;
          return a.student_first.localeCompare(b.student_first);
        })
        .map(s => ({ id: s.id, name: `${s.student_last}, ${s.student_first}` }))}
      selectedId={selectedStudentId}
      onSelect={onStudentSelect}
      disabled={disabled}
      placeholder="Select Student"
    />
  );
};

export default StudentSelector; 