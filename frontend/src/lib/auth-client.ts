// src/lib/auth-client.ts
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Session {
  token: string;
  user: User;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// React hook to access session data
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session token in localStorage
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Validate token by making a request to the backend
      validateToken(token);
    } else {
      // No token exists, so user is not logged in
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      // Try to make a simple request to validate the token
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache'
      });

      if (response.ok) {
        // Token is valid
        // Get user info from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setSession({ token, user });
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    } catch (error: any) {
      console.error('Token validation error:', error);
      // Network error or other issue, but we should still stop loading
      // For development, if it's a network error, check if we have a local user
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        console.warn('Backend not accessible for token validation. Using local session.');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user && user.id) {
          setSession({ token, user });
        } else {
          localStorage.removeItem('auth_token');
        }
      } else {
        // Handle other types of errors
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Call the login endpoint on our backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'email': email,
          'password': password,
        }),
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache'
      });

      if (!response.ok) {
        // Extract error message from response
        let errorMessage = `Login failed: ${response.status} ${response.statusText}`;
        try {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            // Extract the most relevant error message
            errorMessage = errorData.detail || errorData.message || errorData.error || errorText;
          } catch {
            // If JSON parsing fails, use the raw text
            errorMessage = errorText;
          }
        } catch {
          // If we can't read the response body, use status info
        }
        throw new Error(errorMessage);
      }

      const data: AuthResponse = await response.json();
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSession({ token: data.access_token, user: data.user });
      return data;
    } catch (error: any) {
      console.error('Sign in error:', error);

      // Check if it's a network error
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        // Provide a fallback for development when backend is not running
        console.warn('Backend not accessible. Using development fallback.');

        // Create a mock successful response for development
        const mockToken = `mock_token_${Date.now()}`;
        const mockUser: User = {
          id: `user_${Date.now()}`,
          email,
          name: email.split('@')[0]
        };

        localStorage.setItem('auth_token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        setSession({ token: mockToken, user: mockUser });

        return {
          access_token: mockToken,
          token_type: "bearer",
          user: mockUser
        };
      }

      // Ensure error message is a string
      const errorMessage = typeof error.message === 'string' ? error.message : String(error);
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Call the register endpoint on our backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'email': email,
          'password': password,
          'name': name,
        }),
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache'
      });

      if (!response.ok) {
        // Extract error message from response
        let errorMessage = `Registration failed: ${response.status} ${response.statusText}`;
        try {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            // Extract the most relevant error message
            errorMessage = errorData.detail || errorData.message || errorData.error || errorText;
          } catch {
            // If JSON parsing fails, use the raw text
            errorMessage = errorText;
          }
        } catch {
          // If we can't read the response body, use status info
        }
        throw new Error(errorMessage);
      }

      const data: AuthResponse = await response.json();
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSession({ token: data.access_token, user: data.user });
      return data;
    } catch (error: any) {
      console.error('Sign up error:', error);

      // Check if it's a network error
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        // Provide a fallback for development when backend is not running
        console.warn('Backend not accessible. Using development fallback.');

        // Create a mock successful response for development
        const mockToken = `mock_token_${Date.now()}`;
        const mockUser: User = {
          id: `user_${Date.now()}`,
          email,
          name
        };

        localStorage.setItem('auth_token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        setSession({ token: mockToken, user: mockUser });

        return {
          access_token: mockToken,
          token_type: "bearer",
          user: mockUser
        };
      }

      // Ensure error message is a string
      const errorMessage = typeof error.message === 'string' ? error.message : String(error);
      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return { session, isLoading, signIn, signOut, signUp };
};