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

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return process.env.REACT_APP_FIREBASE_API_KEY && 
         process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
         process.env.REACT_APP_FIREBASE_PROJECT_ID;
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
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const { loginWithEmail } = await import('../lib/firebase');
        const { token } = await loginWithEmail(email, password);
        localStorage.setItem('authToken', token);
        
        // Sync with backend
        const response = await authApi.login({ email, password });
        const { user: userData, company: companyData } = response.data;
        
        setUser(userData);
        setCompany(companyData);
        
        return response.data;
      } catch (firebaseError) {
        console.warn('Firebase login failed, trying backend auth:', firebaseError);
        // Fall through to backend auth
      }
    }
    
    // Backend-only authentication
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
    let firebaseUid = null;
    
    // Try Firebase first if configured
    if (isFirebaseConfigured()) {
      try {
        const { registerWithEmail } = await import('../lib/firebase');
        const { user: fbUser, token } = await registerWithEmail(email, password, displayName);
        firebaseUid = fbUser.uid;
        localStorage.setItem('authToken', token);
      } catch (firebaseError) {
        console.warn('Firebase registration failed, using backend only:', firebaseError);
        // Continue without Firebase
      }
    }
    
    // Register in backend
    const response = await authApi.register({
      email,
      password,
      displayName,
      companyName: companyName || null,
      firebaseUid
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
    
    // Try Firebase logout if configured
    if (isFirebaseConfigured()) {
      try {
        const { logoutUser } = await import('../lib/firebase');
        await logoutUser();
      } catch (e) {
        // Ignore
      }
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
