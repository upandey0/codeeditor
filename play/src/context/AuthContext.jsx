import { createContext, useState, useContext, useEffect } from 'react';
import useCodeBuddyApi from '../api/apiService';

// Create context
export const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userStreak, setUserStreak] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize the API hook
  const { login: apiLogin, register: apiRegister } = useCodeBuddyApi();

  // Check for existing user session on mount
  useEffect(() => {
    const checkUserSession = () => {
      const savedUserData = localStorage.getItem('codebuddyUser');
      if (savedUserData) {
        const userData = JSON.parse(savedUserData);
        if (userData.username) {
          setCurrentUser(userData.username);
          setUserPoints(userData.points || 0);
          setUserStreak(userData.streak || 0);
          setIsLoggedIn(!userData.isGuest); // Set to false if it's a guest
        }
      } else {
        // Set guest user with more consistent structure
        const guestUser = {
          username: 'guest_' + Math.random().toString(36).substring(2, 9),
          points: 0,
          streak: 0,
          isGuest: true
        };
        localStorage.setItem('codebuddyUser', JSON.stringify(guestUser));
        setCurrentUser(guestUser.username);
        setUserPoints(0);
        setUserStreak(0);
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    };
    
    checkUserSession();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      const userData = await apiLogin(username, password);
      setCurrentUser(userData.username);
      setUserPoints(userData.points);
      setUserStreak(userData.streak || 0);
      setIsLoggedIn(true);
      return { success: true, data: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Register function
  const register = async (username, password) => {
    try {
      await apiRegister(username, password);
      // Auto login after registration
      return login(username, password);
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('codebuddyUser');
    setCurrentUser(null);
    setUserPoints(0);
    setUserStreak(0);
    setIsLoggedIn(false);
    return { success: true };
  };

  // Update user points
  const updatePoints = (points) => {
    setUserPoints(points);
    if (isLoggedIn && currentUser) {
      const userData = JSON.parse(localStorage.getItem('codebuddyUser') || '{}');
      localStorage.setItem('codebuddyUser', JSON.stringify({
        ...userData,
        points
      }));
    }
  };

  // Update user streak
  const updateStreak = (streak) => {
    setUserStreak(streak);
    if (isLoggedIn && currentUser) {
      const userData = JSON.parse(localStorage.getItem('codebuddyUser') || '{}');
      localStorage.setItem('codebuddyUser', JSON.stringify({
        ...userData,
        streak
      }));
    }
  };

  // Context value
  const value = {
    currentUser,
    userPoints,
    userStreak,
    isLoggedIn,
    isLoading,
    login,
    register,
    logout,
    updatePoints,
    updateStreak,
    isGuest: currentUser === 'guest',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};