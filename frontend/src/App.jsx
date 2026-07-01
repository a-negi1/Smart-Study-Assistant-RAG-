

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider }  from "./context/AuthContext.jsx";
import ProtectedRoute, { PublicRoute } from "./components/auth/ProtectedRoute.jsx";
import AppLayout         from "./components/layout/AppLayout.jsx";

import LoginForm         from "./components/auth/LoginForm.jsx";
import RegisterForm      from "./components/auth/RegisterForm.jsx";

import DashboardPage      from "./pages/DashboardPage.jsx";
import QuizPage           from "./pages/QuizPage.jsx";
import FlashcardsPage     from "./pages/FlashcardsPage.jsx";
import AnalyticsPage      from "./pages/AnalyticsPage.jsx";
import ProfilePage        from "./pages/ProfilePage.jsx";
import DocumentsPage      from "./pages/DocumentsPage.jsx";
import NotebookPage       from "./pages/NotebookPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: "12px",
              background: "#1e293b",
              color: "#f8fafc",
              fontSize: "14px",
              fontWeight: 500,
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#f8fafc" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#f8fafc" } },
          }}
        />

        <Routes>
         
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterForm />
              </PublicRoute>
            }
          />

         
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />}  />
            <Route path="quiz"       element={<QuizPage />}        />
            <Route path="flashcards" element={<FlashcardsPage />}  />
            <Route path="analytics"  element={<AnalyticsPage />}   />
            <Route path="profile"    element={<ProfilePage />}     />
            <Route path="documents"  element={<DocumentsPage />}   />
            <Route path="notebook"   element={<NotebookPage />}    />
          </Route>

         
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
