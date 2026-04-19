import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Users, Clock, Calendar } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { motion } from 'motion/react';

export const AttendancePage: React.FC = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'meetings'), orderBy('startTime', 'desc'));
    const unsubscribeMeetings = onSnapshot(q, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(meetingsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetings');
      setLoading(false);
    });

    const attendanceUnsubscribes: Record<string, () => void> = {};
    const unsubscribeAttendanceMaster = onSnapshot(query(collection(db, 'meetings')), (snapshot) => {
      snapshot.docs.forEach((meetingDoc) => {
        const meetingId = meetingDoc.id;
        if (!attendanceUnsubscribes[meetingId]) {
          attendanceUnsubscribes[meetingId] = onSnapshot(
            collection(db, 'meetings', meetingId, 'attendance'),
            (attSnap) => {
              setAttendance(prev => ({
                ...prev,
                [meetingId]: attSnap.docs.map(d => d.data()).filter(a => a.attended)
              }));
            },
            (err) => console.error(`AttendancePage inner error for ${meetingId}`, err)
          );
        }
      });
      
      const currentIds = snapshot.docs.map(d => d.id);
      Object.keys(attendanceUnsubscribes).forEach(id => {
        if (!currentIds.includes(id)) {
          attendanceUnsubscribes[id]();
          delete attendanceUnsubscribes[id];
        }
      });
    });

    return () => {
      unsubscribeMeetings();
      unsubscribeAttendanceMaster();
      Object.values(attendanceUnsubscribes).forEach(unsub => unsub());
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <header className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold text-text-main">Community Attendance</h1>
        <p className="text-text-muted text-sm mt-1">Real-time participation tracking for all CloudNative learning sessions.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {meetings.length === 0 ? (
          <div className="py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-text-muted italic">No sessions scheduled yet.</p>
          </div>
        ) : (
          meetings.map((meeting) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={meeting.id} 
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row"
            >
              <div className="p-6 md:w-1/3 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    {formatDate(meeting.startTime)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-text-main mb-2">{meeting.title}</h3>
                <div className="flex items-center gap-4 mt-4 text-xs font-medium text-text-main">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{attendance[meeting.id]?.length || 0} Present</span>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 bg-white">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4">Roll Call</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(attendance[meeting.id] || []).length > 0 ? (
                    (attendance[meeting.id] || []).map((att: any, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="w-8 h-8 bg-white rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-bold text-primary">
                          {att.studentName?.[0]?.toUpperCase() || 'S'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-text-main truncate">
                            {att.studentName || 'Student'}
                          </span>
                          <span className="text-[10px] text-text-muted truncate">
                            {att.studentEmail || 'Registered Student'}
                          </span>
                        </div>
                        <div className="ml-auto flex flex-col items-end shrink-0">
                           <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                           <span className="text-[8px] text-text-muted font-mono mt-1">
                             {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="sm:col-span-2 py-6 text-center text-text-muted italic text-xs bg-slate-50/30 rounded-xl border border-dashed border-slate-100">
                      Waiting for students to check in...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
