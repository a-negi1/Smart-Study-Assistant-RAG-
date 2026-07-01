

import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import { authAPI } from "../api/services.js";
import toast from "react-hot-toast";


const initialState = {
  user:            null,
  isAuthenticated: false,
  isLoading:       true,   
};

function authReducer(state, action) {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, isLoading: false };
    case "CLEAR_USER":
      return { ...state, user: null, isAuthenticated: false, isLoading: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        dispatch({ type: "CLEAR_USER" });
        return;
      }
      try {
        const { user } = await authAPI.getMe();
        dispatch({ type: "SET_USER", payload: user });
      } catch {
        
        try {
          const { accessToken } = await authAPI.refresh();
          localStorage.setItem("accessToken", accessToken);
          const { user } = await authAPI.getMe();
          dispatch({ type: "SET_USER", payload: user });
        } catch {
          localStorage.removeItem("accessToken");
          dispatch({ type: "CLEAR_USER" });
        }
      }
    };
    verifySession();
  }, []);

 
  const register = useCallback(async (credentials) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { user, accessToken } = await authAPI.register(credentials);
      localStorage.setItem("accessToken", accessToken);
      dispatch({ type: "SET_USER", payload: user });
      toast.success(`Welcome, ${user.name}! 🎉`);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error ?? "Registration failed.";
      toast.error(msg);
      dispatch({ type: "SET_LOADING", payload: false });
      return { success: false, error: msg };
    }
  }, []);

  
  const login = useCallback(async (credentials) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const { user, accessToken } = await authAPI.login(credentials);
      localStorage.setItem("accessToken", accessToken);
      dispatch({ type: "SET_USER", payload: user });
      toast.success(`Welcome back, ${user.name}!`);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error ?? "Login failed.";
      toast.error(msg);
      dispatch({ type: "SET_LOADING", payload: false });
      return { success: false, error: msg };
    }
  }, []);


  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch { /* ignore */ }
    localStorage.removeItem("accessToken");
    dispatch({ type: "CLEAR_USER" });
    toast.success("Logged out successfully.");
  }, []);

  
  const updateUser = useCallback((updatedUser) => {
    dispatch({ type: "SET_USER", payload: updatedUser });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}


export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
