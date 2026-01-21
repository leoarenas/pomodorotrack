import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, companyApi } from '../lib/api';
import { 
  registerWithEmail, 
  loginWithEmail, 
  logoutUser, 
  subscribeToAuthChanges,
  getCurrentToken 
} from '../lib/firebase';

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
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Subscribe to Firebase auth changes
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Get fresh token and sync with backend
        try {
          const token = await fbUser.getIdToken();
          localStorage.setItem('authToken', token);
          
          // Fetch user data from backend
          const response = await authApi.getMe();
          setUser(response.data.user);
          setCompany(response.data.company);
        } catch (error) {
          console.error('Error syncing user:', error);
          // If backend doesn't have this user yet, they need to complete registration
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
          }
        }
      } else {
        setUser(null);
        setCompany(null);
        localStorage.removeItem('authToken');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    // Login with Firebase
    const { token } = await loginWithEmail(email, password);
    localStorage.setItem('authToken', token);
    
    // Sync with backend
    const response = await authApi.login({ email, password });
    const { user: userData, company: companyData } = response.data;
    
    setUser(userData);
    setCompany(companyData);
    
    return response.data;
  };

  const register = async (email, password, displayName, companyName) => {
    // Register with Firebase
    const { user: fbUser, token } = await registerWithEmail(email, password, displayName);
    localStorage.setItem('authToken', token);
    
    // Register in backend (creates company if provided)
    const response = await authApi.register({
      email,
      password,
      displayName,
      companyName: companyName || null,
      firebaseUid: fbUser.uid
    });
    
    const { user: userData, company: companyData } = response.data;
    
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
    
    // Logout from Firebase
    await logoutUser();
    
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
    const userResponse = await authApi.getMe();
    setUser(userResponse.data.user);
    
    return response.data;
  };

  // Refresh token periodically
  useEffect(() => {
    const refreshToken = async () => {
      if (firebaseUser) {
        try {
          const token = await getCurrentToken();
          if (token) {
            localStorage.setItem('authToken', token);
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }
    };

    // Refresh token every 50 minutes (Firebase tokens expire in 1 hour)
    const interval = setInterval(refreshToken, 50 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [firebaseUser]);

  const value = {
    user,
    company,
    loading,
    firebaseUser,
    isAuthenticated: !!user,
    hasCompany: !!company,
    login,
    register,
    logout,
    createCompany,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
