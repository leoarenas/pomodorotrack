import { createContext, useContext, useState, useEffect } from 'react';
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
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getMe();
      setUser(response.data.user);
      setCompany(response.data.company);
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('company');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
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
    setCompany(response.data);
    localStorage.setItem('company', JSON.stringify(response.data));
    
    // Refresh user data
    await checkAuth();
    
    return response.data;
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
