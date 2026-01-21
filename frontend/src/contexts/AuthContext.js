import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi, companyApi } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  
  const [company, setCompany] = useState(() => {
    try {
      const savedCompany = localStorage.getItem('company');
      return savedCompany ? JSON.parse(savedCompany) : null;
    } catch {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(true);
  const authCheckRef = useRef(false);

  // Check auth only once on mount
  useEffect(() => {
    if (!authCheckRef.current) {
      authCheckRef.current = true;
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      setUser(null);
      setCompany(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      const userData = response.data.user;
      const companyData = response.data.company;
      
      setUser(userData);
      setCompany(companyData);
      
      // Update localStorage with fresh data
      localStorage.setItem('user', JSON.stringify(userData));
      if (companyData) {
        localStorage.setItem('company', JSON.stringify(companyData));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      
      // Only clear if it's definitely a 401
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        setUser(null);
        setCompany(null);
      }
      // On network errors, keep existing localStorage state
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    const { token, user: userData, company: companyData } = response.data;
    
    // Save to localStorage first
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (companyData) {
      localStorage.setItem('company', JSON.stringify(companyData));
    }
    
    // Then update state
    setUser(userData);
    setCompany(companyData);
    
    return response.data;
  };

  const register = async (email, password, displayName, companyName) => {
    const response = await authApi.register({
      email,
      password,
      displayName,
      companyName: companyName || null,
    });
    const { token, user: userData, company: companyData } = response.data;
    
    // Save to localStorage first
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (companyData) {
      localStorage.setItem('company', JSON.stringify(companyData));
    }
    
    // Then update state
    setUser(userData);
    setCompany(companyData);
    
    return response.data;
  };

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
    }
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    
    // Clear state
    setUser(null);
    setCompany(null);
  }, []);

  const createCompany = async (name) => {
    const response = await companyApi.create({ name });
    const companyData = response.data;
    
    // Update localStorage and state
    localStorage.setItem('company', JSON.stringify(companyData));
    setCompany(companyData);
    
    // Refresh user data to get updated role
    try {
      const userResponse = await authApi.getMe();
      const updatedUser = userResponse.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (e) {
      console.error('Error refreshing user data:', e);
    }
    
    return companyData;
  };

  const value = {
    user,
    company,
    loading,
    isAuthenticated: !!user && !!localStorage.getItem('authToken'),
    hasCompany: !!company,
    login,
    register,
    logout,
    createCompany,
    refreshAuth: checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
