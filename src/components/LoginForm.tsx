/**
 * Simplified LoginForm Component
 * 
 * Simple authentication that only accepts:
 * - Email: "supaadmin", Password: "guest"
 * - Any valid email format, Password: "guest"
 */

import React, { useState } from 'react';

interface LoginCredentials {
  email: string;
  password: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  school_id: number;
  role: string;
}

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
  onLoginError: (error: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onLoginError }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // ================================================================================
  // FORM HANDLERS
  // ================================================================================

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    
    // Clear validation errors when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    // Email validation - allow "supaadmin" or valid email
    if (!credentials.email.trim()) {
      errors.email = 'Email is required';
    } else if (credentials.email.toLowerCase() !== 'supaadmin' && !validateEmail(credentials.email)) {
      errors.email = 'Please enter a valid email address or "supaadmin"';
    }

    // Password validation - only "guest" is accepted
    if (!credentials.password) {
      errors.password = 'Password is required';
    } else if (credentials.password !== 'guest') {
      errors.password = 'Password must be "guest"';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Simple authentication - only supaadmin/guest or email/guest
      if (credentials.password === 'guest') {
        const user: User = {
          id: credentials.email.toLowerCase() === 'supaadmin' ? -1 : 1,
          email: credentials.email,
          first_name: credentials.email.toLowerCase() === 'supaadmin' ? 'Super' : 'Guest',
          last_name: credentials.email.toLowerCase() === 'supaadmin' ? 'Admin' : 'User',
          school_id: 1,
          role: credentials.email.toLowerCase() === 'supaadmin' ? 'supaadmin' : 'guest'
        };
        
        onLoginSuccess(user);
      } else {
        onLoginError('Invalid credentials. Use "guest" as password.');
      }
    } catch (error) {
      onLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ================================================================================
  // RENDER
  // ================================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {credentials.email.toLowerCase().includes('supaadmin') ? 'Admin Access' : 'Login'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use "guest" as password for any email
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  validationErrors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Email address or 'supaadmin'"
                value={credentials.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  validationErrors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Password (use 'guest')"
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm; 