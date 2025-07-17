import React from 'react';
import Selector_GenericSingleChoiceSelector from './Selector_GenericSingleChoiceSelector';

interface Cohort {
  id: number;
  cohort_name: string;
}

interface CohortSelectorProps {
  cohorts: Cohort[];
  selectedCohortId: number | null;
  onCohortSelect: (cohortId: number | null) => void;
  disabled?: boolean;
}

const CohortSelector: React.FC<CohortSelectorProps> = ({
  cohorts,
  selectedCohortId,
  onCohortSelect,
  disabled
}) => {
  console.log('🎓 CohortSelector received props:', { 
    cohortsCount: cohorts.length, 
    selectedCohortId, 
    disabled,
    firstCohort: cohorts[0]
  });
  
  // Sort cohorts alphabetically by cohort_name
  const sortedCohorts = [...cohorts].sort((a, b) => 
    a.cohort_name.localeCompare(b.cohort_name)
  );
  
  return (
      <Selector_GenericSingleChoiceSelector
      label="Cohort Selection"
      options={sortedCohorts.map(c => ({ id: c.id, name: c.cohort_name }))}
      selectedId={selectedCohortId}
      onSelect={onCohortSelect}
      disabled={disabled}
      placeholder="Select Cohort (optional)"
    />
  );
};

export default CohortSelector; 