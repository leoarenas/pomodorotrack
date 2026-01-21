import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [user, setUser] = useState(() => {
    // Initialize from localStorage to prevent flash
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [company, setCompany] = useState(() => {
    const savedCompany = localStorage.getItem('company');
    return savedCompany ? JSON.parse(savedCompany) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setUser(null);
      setCompany(null);
      setLoading(false);
      setAuthChecked(true);
      return;
    }

    try {
      const response = await authApi.getMe();
      const userData = response.data.user;
      const companyData = response.data.company;
      
      setUser(userData);
      setCompany(companyData);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      if (companyData) {
        localStorage.setItem('company', JSON.stringify(companyData));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only clear if it's a real auth error, not a network error
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        setUser(null);
        setCompany(null);
      }
      // If network error, keep existing state from localStorage
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) {
      checkAuth();
    }
  }, [authChecked, checkAuth]);

  const login = async (email, password) => {
    // Use backend authentication
    const response = await authApi.login({ email, password });
    const { token, user: userData, company: companyData } = response.data;
    
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (companyData) {
      localStorage.setItem('company', JSON.stringify(companyData));
    }
    
    setUser(userData);
    setCompany(companyData);
    
    return response.data;
  };

  const register = async (email, password, displayName, companyName) => {
    // Register in backend
    const response = await authApi.register({
      email,
      password,
      displayName,
      companyName: companyName || null,
    });
    const { token, user: userData, company: companyData } = response.data;
    
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (companyData) {
      localStorage.setItem('company', JSON.stringify(companyData));
    }
    
    setUser(userData);
    setCompany(companyData);
    
    return response.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore errors
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    setUser(null);
    setCompany(null);
  };

  const createCompany = async (name) => {
    const response = await companyApi.create({ name });
    const companyData = response.data;
    
    setCompany(companyData);
    localStorage.setItem('company', JSON.stringify(companyData));
    
    // Refresh user data to get updated role
    const userResponse = await authApi.getMe();
    setUser(userResponse.data.user);
    localStorage.setItem('user', JSON.stringify(userResponse.data.user));
    
    return companyData;
  };

  const value = {
    user,
    company,
    loading,
    isAuthenticated: !!user,
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
