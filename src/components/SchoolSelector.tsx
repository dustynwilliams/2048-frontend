/**
 * Simple SchoolSelector Component for Reality App
 */

import React from 'react';
import Selector_GenericSingleChoiceSelector from './Selector_GenericSingleChoiceSelector';
import codeToString from '../contexts/code_to_string.json';

interface School {
  id: number;
  school_name: string; // This is actually the school_code
}

interface SchoolSelectorProps {
  schools: School[];
  selectedSchoolId: number | null;
  onSchoolSelect: (schoolId: number | null) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const SchoolSelector: React.FC<SchoolSelectorProps> = ({
  schools,
  selectedSchoolId,
  onSchoolSelect,
  disabled,
  style
}) => {
  // Build a mapping: { [school_code]: company_name }
  const codeMap = Object.fromEntries(
    codeToString.map((entry: { school_code: string; company_name: string }) => [entry.school_code, entry.company_name])
  );

  // Map and sort schools by company_name from the mapping
  const sortedSchools = [...schools]
    .map(s => ({
      ...s,
      display: codeMap[s.school_name]
        ? `${codeMap[s.school_name]} (${s.school_name})`
        : s.school_name // fallback if not found
    }))
    .sort((a, b) => {
      // Sort by company_name (extracted from mapping)
      const aName = codeMap[a.school_name] || a.school_name;
      const bName = codeMap[b.school_name] || b.school_name;
      return aName.localeCompare(bName);
    });

  return (
    <Selector_GenericSingleChoiceSelector
      label="School Selection"
      placeholder="Select a school..."
      options={sortedSchools.map(s => ({ id: s.id, name: s.display }))}
      selectedId={selectedSchoolId}
      onSelect={onSchoolSelect}
      disabled={disabled}
      emptyMessage="No schools available"
    />
  );
};

export default SchoolSelector; 