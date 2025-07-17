/**
 * AuthService - Faculty Authentication
 * 
 * This service handles faculty authentication using the entities_faculty table
 * and provides role-based access control for the application.
 */

// ============================================================================
// AUTH SERVICE - PostgreSQL-based Authentication
// ============================================================================
// 
// PURPOSE: Provides authentication services using PostgreSQL functions
// instead of external services like Supabase.
// 
// AUTHENTICATION FLOW:
// 1. User enters email and password "guest" in LoginForm
// 2. System calls /api/auth/login to authenticate
// 3. System stores user data in localStorage for session management
// 4. System checks permissions using /api/auth/check-access
// ============================================================================

export interface FacultyUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  school_id: number;
  school_name: string;
  role: string;
  can_access_all_schools: boolean;
}

class AuthService {
  private static readonly STORAGE_KEY = 'faculty_user';

  // ============================================================================
  // AUTHENTICATION METHODS
  // ============================================================================

  /**
   * Authenticate faculty member with email and password
   */
  async login(email: string, password: string): Promise<FacultyUser> {
    try {
      console.log('🔄 AuthService.login() called for:', email);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      const user = data.user;

      // Store user data in localStorage for session management
      localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(user));

      console.log('✅ AuthService.login() successful:', user.email);
      return user;

    } catch (error: any) {
      console.error('❌ AuthService.login() failed:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user from localStorage
   */
  getCurrentUser(): FacultyUser | null {
    try {
      const userData = localStorage.getItem(AuthService.STORAGE_KEY);
      if (!userData) {
        return null;
      }

      const user = JSON.parse(userData) as FacultyUser;
      console.log('✅ AuthService.getCurrentUser() found:', user.email);
      return user;

    } catch (error) {
      console.error('❌ AuthService.getCurrentUser() failed:', error);
      return null;
    }
  }

  /**
   * Get current user from server (for session validation)
   */
  async getCurrentUserFromServer(email: string): Promise<FacultyUser | null> {
    try {
      console.log('🔄 AuthService.getCurrentUserFromServer() called for:', email);

      const response = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);

      if (!response.ok) {
        console.log('❌ AuthService.getCurrentUserFromServer() failed: User not found');
        return null;
      }

      const data = await response.json();
      const user = data.user;

      console.log('✅ AuthService.getCurrentUserFromServer() successful:', user.email);
      return user;

    } catch (error: any) {
      console.error('❌ AuthService.getCurrentUserFromServer() failed:', error);
      return null;
    }
  }

  /**
   * Check if faculty member can access a specific school
   */
  async canAccessSchool(schoolId: number): Promise<boolean> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.log('❌ AuthService.canAccessSchool() failed: No current user');
        return false;
      }

      console.log('🔄 AuthService.canAccessSchool() checking:', { 
        email: currentUser.email, 
        schoolId 
      });

      const response = await fetch(
        `/api/auth/check-access?email=${encodeURIComponent(currentUser.email)}&schoolId=${schoolId}`
      );

      if (!response.ok) {
        console.log('❌ AuthService.canAccessSchool() failed: API error');
        return false;
      }

      const data = await response.json();
      const canAccess = data.canAccess;

      console.log('✅ AuthService.canAccessSchool() result:', { 
        email: currentUser.email, 
        schoolId, 
        canAccess 
      });

      return canAccess;

    } catch (error: any) {
      console.error('❌ AuthService.canAccessSchool() failed:', error);
      return false;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      console.log('🔄 AuthService.logout() called');

      // Remove user data from localStorage
      localStorage.removeItem(AuthService.STORAGE_KEY);

      console.log('✅ AuthService.logout() successful');

    } catch (error: any) {
      console.error('❌ AuthService.logout() failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    return user !== null;
  }

  /**
   * Get user's school ID
   */
  getUserSchoolId(): number | null {
    const user = this.getCurrentUser();
    return user?.school_id || null;
  }

  /**
   * Check if user is supaadmin
   */
  isSupaadmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'supaadmin';
  }

  /**
   * Check if user can access all schools
   */
  canAccessAllSchools(): boolean {
    const user = this.getCurrentUser();
    return user?.can_access_all_schools || false;
  }
}

// Export singleton instance
export const authService = new AuthService(); 