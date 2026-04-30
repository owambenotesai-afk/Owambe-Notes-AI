import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { NoteEditor } from './pages/NoteEditor';
import { Tools } from './pages/Tools';
import { Settings } from './pages/Settings';
import { Auth } from './pages/Auth';
import { Toaster } from 'react-hot-toast';

import { Chats } from './pages/Chats';

import { TextToPdf } from './pages/tools/TextToPdf';
import { ReceiptGenerator } from './pages/tools/ReceiptGenerator';
import { DocumentExport } from './pages/tools/DocumentExport';
import { ImageToText } from './pages/tools/ImageToText';
import { AudioTranscription } from './pages/tools/AudioTranscription';
import { SocialMediaDownloader } from './pages/tools/SocialMediaDownloader';
import { WalletNavigator } from './wallet/navigation/WalletNavigator';

import { Posts } from './pages/Posts';
import { Notifications } from './pages/Notifications';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-500">Loading...</div>;
  if (!user || !user.emailVerified) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return <>{children}</>;
};

const ThemeApplier = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (profile?.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System default
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [profile?.theme]);

  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeApplier>
          <BrowserRouter>
            <Toaster position="top-center" />
            <Routes>
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/posts" replace />} />
                <Route path="notes" element={<Dashboard />} />
                <Route path="notes/:id" element={<NoteEditor />} />
                <Route path="posts" element={<Posts />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="chats" element={<Chats />} />
                <Route path="tools" element={<Tools />} />
                <Route path="tools/text-to-pdf" element={<TextToPdf />} />
                <Route path="tools/receipt-generator" element={<ReceiptGenerator />} />
                <Route path="tools/document-export" element={<DocumentExport />} />
                <Route path="tools/image-to-text" element={<ImageToText />} />
                <Route path="tools/audio-transcribe" element={<AudioTranscription />} />
                <Route path="tools/social-media-downloader" element={<SocialMediaDownloader />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<Settings />} />
                <Route path="folders" element={<div className="p-8 text-stone-500">Folders coming soon</div>} />
                <Route path="wallet/*" element={<WalletNavigator />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeApplier>
      </AuthProvider>
    </ErrorBoundary>
  );
}
