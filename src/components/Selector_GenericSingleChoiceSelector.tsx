/**
 * SingleChoiceSelector Component
 * 
 * PURPOSE: A highly reusable, accessible dropdown selector with search functionality
 * ARCHITECTURE: Pure UI component - no Redux dependencies, maximum reusability
 * EXTENSIBILITY: Configurable styling, behavior, and data handling
 * 
 * For Junior Developers:
 * - This is a "dumb" component - it only displays data and calls callbacks
 * - Parent components provide all data and handle all state changes
 * - Fully keyboard accessible and screen reader friendly
 * - Can be used for any type of selection (schools, students, courses, etc.)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TYPE DEFINITIONS - Flexible and extensible for various use cases
// ============================================================================

interface Option {
  id: number;
  name: string;
  displayName?: string;     // Optional custom display format
  // Future extensibility: Add metadata for rich options
  // description?: string;
  // icon?: string;
  // category?: string;
  // disabled?: boolean;
  // metadata?: Record<string, any>;
}

interface SingleChoiceSelectorProps {
  // Required props
  label: string;
  placeholder: string;
  options: Option[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  
  // Optional behavior props
  loading?: boolean;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  
  // Future extensibility: Add customization props
  // variant?: 'default' | 'compact' | 'large';
  // allowMultiple?: boolean;
  // showClearButton?: boolean;
  // maxDisplayItems?: number;
  // onSearch?: (term: string) => void; // For server-side search
  // renderOption?: (option: Option) => React.ReactNode; // Custom option rendering
}

// ============================================================================
// CONFIGURATION - Centralized styling and behavior settings
// ============================================================================

const SELECTOR_CONFIG = {
  // UI behavior settings
  behavior: {
    minSearchLength: 0,        // Minimum characters before search activates
    searchDebounceMs: 150,     // Debounce search input for performance
    maxDropdownHeight: '24rem', // Maximum dropdown height
    minDropdownHeight: '200px', // Minimum dropdown height for small screens
  },
  
  // Styling configuration - easily customizable for themes
  styles: {
    container: 'bg-white rounded-lg shadow p-4 relative',
    label: 'block text-sm font-medium text-gray-700 mb-2',
    input: 'w-full px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    inputDisabled: 'bg-gray-100 cursor-not-allowed',
    dropdown: 'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-y-auto',
    option: 'px-3 py-2 cursor-pointer text-sm hover:bg-blue-50',
    optionSelected: 'bg-blue-100 text-blue-900',
    optionDefault: 'text-gray-900',
    clearButton: 'absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600',
    loadingSpinner: 'absolute right-2 top-1/2 transform -translate-y-1/2',
    emptyState: 'px-3 py-2 text-gray-500 text-sm',
    counter: 'mt-1 text-xs text-gray-500',
  },
  
  // Accessibility settings
  accessibility: {
    ariaLabels: {
      clearButton: 'Clear selection',
      dropdown: 'Options list',
      loading: 'Loading options',
    },
    keyboardShortcuts: {
      escape: 'Close dropdown',
      enter: 'Select option',
      arrowUp: 'Previous option',
      arrowDown: 'Next option',
    }
  }
} as const;

// ============================================================================
// UTILITY FUNCTIONS - Reusable logic separated for testing and maintenance
// ============================================================================

/**
 * Filters options based on search term
 * EXTENSIBILITY: Easy to modify search algorithm or add fuzzy matching
 */
const filterOptions = (options: Option[], searchTerm: string): Option[] => {
  if (!searchTerm || searchTerm.length < SELECTOR_CONFIG.behavior.minSearchLength) {
    return options;
  }

  const searchLower = searchTerm.toLowerCase();
  
  return options.filter(option => {
    const name = option.name.toLowerCase();
    const displayName = option.displayName?.toLowerCase() || '';
    
    // Basic contains search - future: could add fuzzy matching, ranking, etc.
    return name.includes(searchLower) || displayName.includes(searchLower);
    
    // Future extensibility: Advanced search features
    // - Fuzzy matching: return fuzzyMatch(searchLower, name) || fuzzyMatch(searchLower, displayName);
    // - Category search: return option.category?.toLowerCase().includes(searchLower);
    // - Description search: return option.description?.toLowerCase().includes(searchLower);
  });
};

/**
 * Calculates optimal dropdown height based on available screen space
 * RESPONSIVENESS: Ensures dropdown fits within viewport
 */
const calculateDropdownHeight = (
  dropdownElement: HTMLDivElement | null,
  fallbackHeight: string = SELECTOR_CONFIG.behavior.maxDropdownHeight
): string => {
  if (!dropdownElement) return fallbackHeight;
  
  const rect = dropdownElement.getBoundingClientRect();
  const availableHeight = window.innerHeight - rect.bottom - 20; // 20px padding
  const minHeight = parseInt(SELECTOR_CONFIG.behavior.minDropdownHeight);
  
  return `${Math.max(minHeight, availableHeight)}px`;
};

// ============================================================================
// CUSTOM HOOKS - Reusable stateful logic
// ============================================================================

/**
 * Hook for managing dropdown visibility and keyboard navigation
 * MODULARITY: Separated for reuse in other selector components
 */
const useDropdownState = (disabled: boolean, loading: boolean) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<string>(SELECTOR_CONFIG.behavior.maxDropdownHeight);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Calculate dropdown height when it opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const height = calculateDropdownHeight(dropdownRef.current);
      setDropdownMaxHeight(height);
    }
  }, [isOpen]);

  // Close dropdown when disabled or loading
  useEffect(() => {
    if (disabled || loading) {
      setIsOpen(false);
    }
  }, [disabled, loading]);

  const openDropdown = useCallback(() => {
    if (!disabled && !loading) {
      setIsOpen(true);
    }
  }, [disabled, loading]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    dropdownMaxHeight,
    dropdownRef,
    inputRef,
    openDropdown,
    closeDropdown,
  };
};

/**
 * Hook for managing search state with debouncing
 * PERFORMANCE: Prevents excessive filtering on rapid typing
 */
const useSearchState = (options: Option[], onOpen: () => void) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, SELECTOR_CONFIG.behavior.searchDebounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset search when options change (e.g., new data loaded)
  // Like when you change the school, cohort, course_block, whatever
  useEffect(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, [options]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onOpen();
  }, [onOpen]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);

  const filteredOptions = filterOptions(options, debouncedSearchTerm);

  return {
    searchTerm,
    filteredOptions,
    handleInputChange,
    clearSearch,
  };
};

// ============================================================================
// MAIN COMPONENT - Clean, accessible, and well-documented
// ============================================================================

const SingleChoiceSelector: React.FC<SingleChoiceSelectorProps> = ({
  // Required props
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  
  // Optional props with defaults
  loading = false,
  disabled = false,
  emptyMessage = "No options available",
  searchPlaceholder = "Search...",
}) => {
  // ---------------------------------------------------------------------------
  // HOOKS AND STATE - Organized and well-separated concerns
  // ---------------------------------------------------------------------------
  
  const {
    isOpen,
    dropdownMaxHeight,
    dropdownRef,
    inputRef,
    openDropdown,
    closeDropdown,
  } = useDropdownState(disabled, loading);

  const {
    searchTerm,
    filteredOptions,
    handleInputChange,
    clearSearch,
  } = useSearchState(options, openDropdown);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES - Derived state for display and behavior
  // ---------------------------------------------------------------------------
  
  // Get selected option for display
  const selectedOption = options.find(option => option.id === selectedId);
  
  // Determine what to show in the input field
  const getDisplayValue = useCallback(() => {
    if (selectedOption && !isOpen) {
      return selectedOption.displayName || selectedOption.name;
    }
    return searchTerm;
  }, [selectedOption, isOpen, searchTerm]);

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS - Clean, focused, and well-documented
  // ---------------------------------------------------------------------------
  
  /**
   * Handles option selection and cleanup
   * EXTENSIBILITY: Easy to add selection validation or transformation
   */
  const handleOptionSelect = useCallback((optionId: number, optionName: string) => {
    onSelect(optionId);
    clearSearch();
    closeDropdown();
    
    // Set search term to selected option name for display
    // Note: This will be overridden by getDisplayValue() when dropdown closes
    
    // Future extensibility: Add selection analytics, validation, etc.
    // analytics.track('option_selected', { optionId, optionName });
    // if (onSelectionValidate && !onSelectionValidate(optionId)) return;
  }, [onSelect, clearSearch, closeDropdown]);

  /**
   * Handles clearing the selection
   * ACCESSIBILITY: Focuses input after clearing for keyboard users
   */
  const handleClearSelection = useCallback(() => {
    onSelect(null);
    clearSearch();
    closeDropdown();
    inputRef.current?.focus();
    
    // Future extensibility: Add clear analytics
    // analytics.track('selection_cleared');
  }, [onSelect, clearSearch, closeDropdown]);

  /**
   * Handles input focus with accessibility considerations
   * ACCESSIBILITY: Only opens dropdown if component is interactive
   */
  const handleInputFocus = useCallback(() => {
    if (!disabled && !loading) {
      openDropdown();
    }
  }, [disabled, loading, openDropdown]);

  // ---------------------------------------------------------------------------
  // KEYBOARD NAVIGATION - Full accessibility support
  // ---------------------------------------------------------------------------
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        closeDropdown();
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          // Select first option on Enter (future: could track highlighted option)
          handleOptionSelect(filteredOptions[0].id, filteredOptions[0].name);
        }
        break;
      // Future extensibility: Add arrow key navigation
      // case 'ArrowDown':
      // case 'ArrowUp':
      //   e.preventDefault();
      //   handleArrowNavigation(e.key);
      //   break;
    }
  }, [isOpen, filteredOptions, closeDropdown, handleOptionSelect]);

  // ---------------------------------------------------------------------------
  // RENDER LOGIC - Clean separation of UI concerns
  // ---------------------------------------------------------------------------

  // Disabled state
  if (disabled) {
    return (
      <div className={SELECTOR_CONFIG.styles.container}>
        <label className={SELECTOR_CONFIG.styles.label}>
          {label}
        </label>
        <div className="text-gray-500 text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  // Main interactive component
  return (
    <div className={SELECTOR_CONFIG.styles.container} ref={dropdownRef}>
      {/* Accessible Label */}
      <label className={SELECTOR_CONFIG.styles.label} htmlFor={`selector-${label}`}>
        {label}
      </label>
      
      {/* Input Container with Controls */}
      <div className="relative">
        {/* Main Search Input */}
        <input
          id={`selector-${label}`}
          autoComplete="off"
          ref={inputRef}
          type="text"
          placeholder={searchPlaceholder}
          value={getDisplayValue()}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={`${SELECTOR_CONFIG.styles.input} ${loading ? SELECTOR_CONFIG.styles.inputDisabled : ''}`}
          disabled={loading}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`${label} selector`}
          // Future extensibility: Add more ARIA attributes
          // aria-describedby={`${label}-description`}
          // aria-activedescendant={highlightedOptionId}
        />
        
        {/* Clear Button - Only show when there's a selection */}
        {(selectedOption || searchTerm) && !loading && (
          <button
            type="button"
            onClick={handleClearSelection}
            className={SELECTOR_CONFIG.styles.clearButton}
            aria-label={SELECTOR_CONFIG.accessibility.ariaLabels.clearButton}
            tabIndex={-1} // Prevent tab focus, use mouse/touch only
          >
            ✕
          </button>
        )}
        
        {/* Loading Indicator */}
        {loading && (
          <div 
            className={SELECTOR_CONFIG.styles.loadingSpinner}
            aria-label={SELECTOR_CONFIG.accessibility.ariaLabels.loading}
          >
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Dropdown List - Only render when open */}
      {isOpen && !loading && (
        <div 
          className={SELECTOR_CONFIG.styles.dropdown}
          style={{ maxHeight: dropdownMaxHeight }}
          role="listbox"
          aria-label={SELECTOR_CONFIG.accessibility.ariaLabels.dropdown}
        >
          {filteredOptions.length === 0 ? (
            // Empty State
            <div className={SELECTOR_CONFIG.styles.emptyState}>
              {searchTerm ? 'No matches found' : emptyMessage}
              {/* Future extensibility: Add helpful actions for empty state */}
              {/* {onCreateNew && <button onClick={() => onCreateNew(searchTerm)}>Create "{searchTerm}"</button>} */}
            </div>
          ) : (
            // Options List
            filteredOptions.map((option) => {
              const displayName = option.displayName || option.name;
              const isSelected = selectedId === option.id;
              
              return (
                <div
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id, displayName)}
                  className={`${SELECTOR_CONFIG.styles.option} ${
                    isSelected 
                      ? SELECTOR_CONFIG.styles.optionSelected 
                      : SELECTOR_CONFIG.styles.optionDefault
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  // Future extensibility: Add more option metadata
                  // title={option.description}
                  // data-category={option.category}
                >
                  {displayName}
                  {/* Future extensibility: Rich option rendering */}
                  {/* {renderOption ? renderOption(option) : displayName} */}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Status/Help Text - Extensible for additional information */}
      {!disabled && options.length > 0 && (
        <div className={SELECTOR_CONFIG.styles.counter}>
          {filteredOptions.length} of {options.length} {label.toLowerCase()}
          {searchTerm && filteredOptions.length !== options.length && ' (filtered)'}
          {/* Future extensibility: Add keyboard shortcuts help, status messages, etc. */}
          {/* {showKeyboardHelp && <span className="ml-2">Press ↑↓ to navigate, Enter to select</span>} */}
        </div>
      )}
    </div>
  );
};

export default SingleChoiceSelector;