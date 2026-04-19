import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { AttendancePage } from './pages/AttendancePage';
import { Logo } from './components/Logo';
import { LayoutDashboard, ShieldCheck, LogOut, User, BarChart3, ListChecks, PlayCircle, BookOpen, MessageSquare, Map, Sparkles } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Placeholder Pages for new sections
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
      <Sparkles className="w-10 h-10 text-primary animate-pulse" />
    </div>
    <h1 className="text-2xl font-bold text-text-main">{title}</h1>
    <p className="text-text-muted mt-2 max-w-md">
      Our team is currently finalizing the <span className="text-primary font-bold">{title}</span> module for the CN Portal curriculum. Stay tuned for expert-led content!
    </p>
  </div>
);

const VideoPortal = () => {
  const { profile, isAdmin } = useAuth();
  const [folders, setFolders] = React.useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = React.useState<any | null>(null);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'folders'), (snapshot) => {
      const allFolders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Filter based on access groups
      const authorized = allFolders.filter(folder => {
        // Admins and "Full Access" students see all
        if (isAdmin || profile?.hasVideoAccess) return true;
        
        // Check if folder has no groups (Public) or if student shares a group
        const folderGroups = folder.groups || [];
        if (folderGroups.length === 0) return true;
        
        const studentGroups = profile?.groups || [];
        return folderGroups.some((g: string) => studentGroups.includes(g));
      });
      
      setFolders(authorized);
      if (authorized.length > 0 && !selectedFolder) {
        setSelectedFolder(authorized[0]);
      }
    }, (err) => console.error('Folders listener error', err));

    return () => unsubscribe();
  }, [isAdmin, profile, selectedFolder]);

  if (folders.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <PlayCircle className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-text-main">No Folders Available</h1>
        <p className="text-text-muted mt-2 max-w-sm">
          You don't have access to any video folders yet. Please contact the administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-40px)] flex flex-col pt-4 px-4 md:px-8 pb-8">
      {/* Folder Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolder(folder)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedFolder?.id === folder.id
                ? 'bg-primary text-white border-primary shadow-lg shadow-blue-500/20'
                : 'bg-white text-text-muted border-slate-200 hover:border-primary hover:text-primary'
            }`}
          >
            {folder.title}
          </button>
        ))}
      </div>

      {selectedFolder && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
               <h1 className="text-xl font-bold text-text-main">{selectedFolder.title}</h1>
               <p className="text-xs text-text-muted">Currently viewing authorized content from Google Drive</p>
            </div>
            <div className="hidden sm:block bg-blue-100 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
               Authorized: {isAdmin ? 'Admin' : 'Group Member'}
            </div>
          </div>
          <div className="flex-1 bg-white relative">
            <iframe 
              src={`https://drive.google.com/embeddedfolderview?id=${selectedFolder.driveId}#list`} 
              className="absolute inset-0 w-full h-full border-none" 
              allow="autoplay"
              title={selectedFolder.title}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

const Navigation = () => {
  const { user, profile, isAdmin } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    signOut(auth);
  };

  if (!user) return null;

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, role: 'student' },
    { to: '/analytics', label: 'Learning Analytics', icon: BarChart3, role: 'student' },
    { to: '/attendance', label: 'Attendance', icon: ListChecks, role: 'student' },
    { to: '/videos', label: 'Videos', icon: PlayCircle, role: 'student' },
    { to: '/references', label: 'References', icon: BookOpen, role: 'student' },
    { to: '/qa', label: 'Q&A', icon: MessageSquare, role: 'student' },
    { to: '/roadmap', label: 'Career Roadmap', icon: Map, role: 'student' },
    { to: '/mentor', label: 'AI Mentor', icon: Sparkles, role: 'student' },
    { to: '/admin', label: 'Admin Panel', icon: ShieldCheck, role: 'admin' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-20 md:w-60 bg-sidebar text-white/70 flex flex-col z-50 transition-all">
      <div className="p-6 mb-4">
        <Logo className="md:flex hidden text-white" />
        <div className="md:hidden flex justify-center">
           <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">C</div>
        </div>
      </div>

      <div className="flex-1 px-3 space-y-1 overflow-y-auto pt-4">
        {links.map((link) => {
          if (link.role === 'admin' && !isAdmin) return null;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all text-sm font-medium ${
                isActive 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <link.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-inherit'}`} />
              <span className="hidden md:block">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-xl">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center shrink-0">
             <User className="w-4 h-4 text-white/50" />
          </div>
          <div className="hidden md:block overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{user.email?.split('@')[0]}</p>
            <p className="text-[10px] font-bold text-accent-devops uppercase tracking-widest">{isAdmin ? 'Admin' : 'Student'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-400/10 transition-all text-sm font-medium"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="hidden md:block">Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

const VideoRoute = () => {
  return <VideoPortal />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <Navigation />
          <main className="md:pl-60 min-h-screen">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={<ProtectedRoute><PlaceholderPage title="Learning Analytics" /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
              <Route path="/videos" element={
                <ProtectedRoute>
                  <VideoRoute />
                </ProtectedRoute>
              } />
              <Route path="/references" element={<ProtectedRoute><PlaceholderPage title="Resource References" /></ProtectedRoute>} />
              <Route path="/qa" element={<ProtectedRoute><PlaceholderPage title="Community Q&A" /></ProtectedRoute>} />
              <Route path="/roadmap" element={<ProtectedRoute><PlaceholderPage title="DevOps Learning Roadmap" /></ProtectedRoute>} />
              <Route path="/mentor" element={<ProtectedRoute><PlaceholderPage title="AI Career Co-pilot" /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
