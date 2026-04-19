import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Trash2, Users, Video, Clock, CheckCircle2, XCircle, FolderOpen, Tag, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

export const AdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any[]>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'users' | 'folders'>('sessions');
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    videoLink: '',
    startTime: '',
    endTime: '',
  });

  const [newFolder, setNewFolder] = useState({
    title: '',
    driveId: '',
    groups: '' // comma separated
  });

  useEffect(() => {
    // Sessions listener
    const q = query(collection(db, 'meetings'), orderBy('startTime', 'desc'));
    const unsubscribeSessions = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetings');
    });

    // Attendance listeners map to keep track of unsub functions
    const attendanceUnsubscribes: Record<string, () => void> = {};

    // Watch meetings to update attendance listeners
    const qMeetings = query(collection(db, 'meetings'));
    const unsubscribeAttendanceMaster = onSnapshot(qMeetings, (snapshot) => {
      snapshot.docs.forEach((meetingDoc) => {
        const meetingId = meetingDoc.id;
        if (!attendanceUnsubscribes[meetingId]) {
          attendanceUnsubscribes[meetingId] = onSnapshot(
            collection(db, 'meetings', meetingId, 'attendance'),
            (attSnap) => {
              setAttendance(prev => ({
                ...prev,
                [meetingId]: attSnap.docs.map(d => d.data())
              }));
            },
            (err) => console.error(`Attendance listener error for ${meetingId}`, err)
          );
        }
      });
      
      // Cleanup removed meetings
      const currentIds = snapshot.docs.map(d => d.id);
      Object.keys(attendanceUnsubscribes).forEach(id => {
        if (!currentIds.includes(id)) {
          attendanceUnsubscribes[id]();
          delete attendanceUnsubscribes[id];
        }
      });
    });

    // Users listener
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error('Users listener error', err));

    // Folders listener
    const unsubscribeFolders = onSnapshot(collection(db, 'folders'), (snapshot) => {
      setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error('Folders listener error', err));

    return () => {
      unsubscribeSessions();
      unsubscribeAttendanceMaster();
      unsubscribeUsers();
      unsubscribeFolders();
      Object.values(attendanceUnsubscribes).forEach(unsub => unsub());
    };
  }, []);

  const handleUpdateStudentGroups = async (userId: string, groupString: string) => {
    try {
      const groups = groupString.split(',').map(g => g.trim()).filter(g => g !== '');
      await updateDoc(doc(db, 'users', userId), {
        groups: groups
      });
    } catch (err) {
      console.error('Failed to update groups', err);
    }
  };

  const handleToggleVideoAccess = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        hasVideoAccess: !currentStatus
      });
    } catch (err) {
      console.error('Failed to toggle access', err);
    }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const groups = newFolder.groups.split(',').map(g => g.trim()).filter(g => g !== '');
      await addDoc(collection(db, 'folders'), {
        title: newFolder.title,
        driveId: newFolder.driveId,
        groups: groups,
        createdAt: new Date().toISOString()
      });
      setNewFolder({ title: '', driveId: '', groups: '' });
      setShowAdd(false);
    } catch (err) {
      console.error('Failed to add folder', err);
    }
  };

  const handleToggleAttendance = async (meetingId: string, student: any) => {
    try {
      const isPresent = (attendance[meetingId] || []).some(a => a.studentId === student.id && a.attended);
      await setDoc(doc(db, 'meetings', meetingId, 'attendance', student.id), {
        studentId: student.id,
        studentEmail: student.email,
        studentName: student.displayName || student.email.split('@')[0],
        meetingId: meetingId,
        attended: !isPresent,
        timestamp: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Attendance update failed', err);
    }
  };

  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      await addDoc(collection(db, 'meetings'), {
        ...newMeeting,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setNewMeeting({ title: '', description: '', videoLink: '', startTime: '', endTime: '' });
    } catch (err) {
      console.error('Failed to add meeting', err);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'meetings', id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Admin Operations</h1>
          <p className="text-text-muted text-sm mt-0.5">Manage the CN Portal learning schedule and monitor participation.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'sessions' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            >
              Sessions
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab('folders')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'folders' ? 'bg-white text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            >
              Folders
            </button>
          </div>
          {(activeTab === 'sessions' || activeTab === 'folders') && (
            <button
              onClick={() => setShowAdd(true)}
              className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'sessions' ? 'Schedule Session' : 'Add Folder'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && activeTab === 'sessions' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-2xl border border-blue-100 shadow-xl shadow-blue-500/5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <h2 className="text-lg font-bold text-text-main mb-6">Create New Learning Session</h2>
            <form onSubmit={handleAddMeeting} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Session Title</label>
                  <input
                    required
                    value={newMeeting.title}
                    onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    placeholder="e.g. Introduction to Kubernetes"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Video URL (Google Drive)</label>
                  <input
                    value={newMeeting.videoLink}
                    onChange={e => setNewMeeting({ ...newMeeting, videoLink: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={newMeeting.startTime}
                      onChange={e => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={newMeeting.endTime}
                      onChange={e => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Description</label>
                  <textarea
                    rows={1}
                    value={newMeeting.description}
                    onChange={e => setNewMeeting({ ...newMeeting, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all resize-none"
                    placeholder="What will students learn?"
                  />
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 py-3 rounded-lg font-bold text-text-muted text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-text-main text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-black shadow-lg shadow-black/10 transition-all"
                >
                  Create Session
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {showAdd && activeTab === 'folders' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-2xl border border-blue-100 shadow-xl shadow-blue-500/5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <h2 className="text-lg font-bold text-text-main mb-6">Link New Media Folder</h2>
            <form onSubmit={handleAddFolder} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Folder Title</label>
                  <input
                    required
                    value={newFolder.title}
                    onChange={e => setNewFolder({ ...newFolder, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    placeholder="e.g. AWS Certified DevOps Engineer"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Drive Folder ID</label>
                  <input
                    required
                    value={newFolder.driveId}
                    onChange={e => setNewFolder({ ...newFolder, driveId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    placeholder="e.g. 1Xj4lyZhYRkX4paEnx1Wb0CDQukeOJqf5"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2 block">Authorized Groups (comma separated)</label>
                  <input
                    value={newFolder.groups}
                    onChange={e => setNewFolder({ ...newFolder, groups: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all"
                    placeholder="Batch-2024, Premium, AWS-Evening"
                  />
                  <p className="text-[10px] text-text-muted mt-2 italic flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Students must belong to at least one of these groups to see this folder.
                  </p>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-6 py-3 rounded-lg font-bold text-text-muted text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-text-main text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-black shadow-lg shadow-black/10 transition-all"
                >
                  Add Folder
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'sessions' ? (
        <div className="grid grid-cols-1 gap-4">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all group">
              {/* Session Card Content... */}
              <div className="flex flex-col md:flex-row">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em]">
                          {formatDate(meeting.startTime)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-text-main group-hover:text-primary transition-colors">{meeting.title}</h3>
                      <div className="mt-4 flex items-center gap-6">
                         <span className="flex items-center gap-2 text-xs text-text-main font-medium">
                            <Users className="w-4 h-4 text-text-muted" />
                            <span className="text-primary font-bold">{attendance[meeting.id]?.length || 0}</span> Attendees
                         </span>
                         <span className="flex items-center gap-2 text-xs text-text-main font-medium">
                            <Video className="w-4 h-4 text-text-muted" />
                            {meeting.videoLink ? <span className="text-green-600 font-bold">Video Available</span> : <span className="text-text-muted">No Media</span>}
                         </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {deleteConfirmId === meeting.id ? (
                        <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-100">
                          <button 
                            onClick={() => handleDelete(meeting.id)}
                            className="text-[10px] font-bold bg-red-600 text-white px-3 py-1.5 rounded-md shadow-sm"
                          >
                            Confirm Delete
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] font-bold text-text-muted hover:text-text-main"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(meeting.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50/50 p-6 min-w-[320px] border-l border-border flex flex-col">
                   <h4 className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
                      Attendance Management
                      <button 
                        onClick={() => setExpandedMeeting(expandedMeeting === meeting.id ? null : meeting.id)}
                        className="text-primary hover:underline"
                      >
                        {expandedMeeting === meeting.id ? 'Collapse' : 'Manage All'}
                      </button>
                   </h4>
                   <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] scrollbar-hide">
                      {expandedMeeting === meeting.id ? (
                        users.map((student) => {
                          const attRecord = (attendance[meeting.id] || []).find(a => a.studentId === student.id);
                          const isPresent = attRecord?.attended;
                          
                          return (
                            <div key={student.id} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-100 text-[11px] shadow-sm">
                              <div className={cn("w-1.5 h-1.5 rounded-full", isPresent ? "bg-green-400" : "bg-slate-200")} />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-bold text-text-main truncate">{student.displayName || student.email.split('@')[0]}</span>
                                <span className="text-[9px] text-text-muted truncate">{student.email}</span>
                              </div>
                              <button
                                onClick={() => handleToggleAttendance(meeting.id, student)}
                                className={cn(
                                  "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all",
                                  isPresent ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                                )}
                              >
                                {isPresent ? 'Mark Absent' : 'Mark Present'}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <>
                          {(attendance[meeting.id] || []).filter(a => a.attended).slice(0, 5).map((att: any, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-100 text-[11px] shadow-sm">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-bold text-text-main truncate">{att.studentName || att.studentId.substring(0, 6)}</span>
                                <span className="text-[9px] text-text-muted truncate">{att.studentEmail || 'N/A'}</span>
                              </div>
                              <span className="text-[9px] text-text-muted font-mono shrink-0">{new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ))}
                          {(attendance[meeting.id] || []).filter(a => a.attended).length === 0 && (
                            <p className="text-[10px] text-text-muted italic">No students checked in yet.</p>
                          )}
                          {(attendance[meeting.id] || []).filter(a => a.attended).length > 5 && (
                            <p className="text-center text-[9px] text-primary font-bold mt-2">
                              + {(attendance[meeting.id] || []).filter(a => a.attended).length - 5} more present
                            </p>
                          )}
                        </>
                      )}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'users' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Student Profile</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Assigned Groups</th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-text-muted">Quick Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[11px] font-bold text-primary border border-slate-200">
                        {(u.displayName || u.email[0]).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-main">{u.displayName || 'Unnamed Student'}</span>
                        <span className="text-[10px] text-text-muted">{u.email}</span>
                        <span className="text-[9px] text-text-muted mt-1 uppercase tracking-tighter font-bold">Joined: {formatDate(u.createdAt)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                       <div className="flex flex-wrap gap-1">
                          {(u.groups || []).map((g: string) => (
                            <span key={g} className="bg-blue-50 text-blue-600 text-[9px] font-bold px-2 py-0.5 rounded-md border border-blue-100">
                              {g}
                            </span>
                          ))}
                          {(!u.groups || u.groups.length === 0) && (
                            <span className="text-slate-300 text-[10px] italic">No groups assigned</span>
                          )}
                       </div>
                       <input 
                         type="text" 
                         defaultValue={(u.groups || []).join(', ')}
                         onBlur={(e) => handleUpdateStudentGroups(u.id, e.target.value)}
                         placeholder="New groups..."
                         className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary/20"
                       />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-2">
                       <button
                         onClick={() => handleToggleVideoAccess(u.id, u.hasVideoAccess)}
                         disabled={u.role === 'admin'}
                         className={`w-full flex items-center justify-between gap-3 p-1.5 pl-3 pr-2 rounded-lg border transition-all ${
                           u.hasVideoAccess 
                             ? 'bg-green-50 border-green-100 text-green-700' 
                             : 'bg-slate-50 border-slate-100 text-slate-500'
                         } ${u.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
                       >
                         <span className="text-[9px] font-bold uppercase truncate">Full Lib Access</span>
                         {u.hasVideoAccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((folder) => (
            <div key={folder.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <button 
                  onClick={async () => await deleteDoc(doc(db, 'folders', folder.id))}
                  className="p-1 text-slate-300 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-text-main mb-1">{folder.title}</h3>
              <p className="text-[10px] font-mono text-text-muted truncate mb-4">{folder.driveId}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Access Groups</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(folder.groups || []).map((g: string) => (
                    <span key={g} className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md">
                      {g}
                    </span>
                  ))}
                  {(!folder.groups || folder.groups.length === 0) && (
                    <span className="text-amber-600 text-[9px] font-bold bg-amber-50 px-2 py-0.5 rounded-md">Public (All Library)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {folders.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
              <Video className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-text-muted italic">No media folders configured yet.</p>
              <button 
                onClick={() => setShowAdd(true)}
                className="mt-4 text-primary font-bold text-sm hover:underline"
              >
                Create your first folder access group
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
