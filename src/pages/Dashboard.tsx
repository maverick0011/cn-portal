import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { VideoPlayer } from '../components/VideoPlayer';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export const Dashboard: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  
  useEffect(() => {
    const q = query(collection(db, 'meetings'), orderBy('startTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeetings(meetingsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetings');
    });

    return () => unsubscribe();
  }, []);

  const handleJoinMeeting = async (meeting: any) => {
    setSelectedMeeting(meeting);
    // Mark attendance
    if (user && !isAdmin) {
      try {
        await setDoc(doc(db, 'meetings', meeting.id, 'attendance', user.uid), {
          studentId: user.uid,
          studentEmail: user.email,
          studentName: profile?.displayName || user.email?.split('@')[0],
          meetingId: meeting.id,
          attended: true,
          timestamp: new Date().toISOString()
        }, { merge: true });
        console.log('Attendance marked');
      } catch (err) {
        console.error('Failed to mark attendance', err);
      }
    }
  };

  const meetingsOnSelectedDay = meetings.filter(m => {
    const date = new Date(m.startTime);
    return date.toDateString() === selectedDay?.toDateString();
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            Session Dashboard
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Welcome back, 
            <input
              type="text"
              defaultValue={profile?.displayName || user?.email?.split('@')[0]}
              onBlur={async (e) => {
                if (user && e.target.value !== profile?.displayName) {
                  await updateDoc(doc(db, 'users', user.uid), { displayName: e.target.value });
                }
              }}
              className="mx-1 text-primary font-bold bg-transparent border-b border-dashed border-primary/30 outline-none focus:border-primary w-fit inline-block"
              placeholder="Username"
            />.
            DevOps learning in progress.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold">{profile?.displayName || 'Active User'}</p>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {selectedMeeting ? (
            <div className="space-y-6">
              <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video relative group border border-slate-200">
                <VideoPlayer url={selectedMeeting.videoLink} />
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded border border-white/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  GOOGLE DRIVE STREAM
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-text-main">{selectedMeeting.title}</h2>
                    <p className="text-text-muted mt-2 text-sm leading-relaxed">{selectedMeeting.description}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                       Session Recorded
                    </span>
                    <RatingSystem meetingId={selectedMeeting.id} studentId={user?.uid} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <VideoPlayer url="" placeholder />
              </div>
              <h3 className="text-lg font-bold text-text-main">Select a Session</h3>
              <p className="text-text-muted text-sm mt-2 max-w-xs mx-auto">
                Access your DevOps curriculum by selecting a scheduled meeting from the side panel.
              </p>
            </div>
          )}

          {/* DevOps Strategy Card (from design) */}
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
            <h3 className="text-amber-900 font-bold text-sm flex items-center gap-2">
              🚀 DevOps Deployment Strategy (Free Tier)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-amber-800 leading-relaxed">
              <div>
                <strong className="block text-amber-900 mb-1">Frontend</strong>
                Deploy to GitHub Pages or Netlify for instant scalability at $0 cost.
              </div>
              <div>
                <strong className="block text-amber-900 mb-1">Backend/Auth</strong>
                Firebase free tier handles global auth and regional Firestore instances.
              </div>
              <div>
                <strong className="block text-amber-900 mb-1">Media</strong>
                Bandwidth-free video serving via Google Drive API embedding.
              </div>
              <div>
                <strong className="block text-amber-900 mb-1">Automation</strong>
                GitHub Actions for CI/CD deployments on every push.
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <h2 className="text-sm font-bold text-text-main mb-6 px-1 flex items-center gap-2 uppercase tracking-widest text-[10px]">
              <Calendar className="w-4 h-4 text-primary" />
              Schedule Calendar
            </h2>
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              className="rdp-professional"
              modifiers={{
                hasMeeting: meetings.map(m => new Date(m.startTime))
              }}
              modifiersClassNames={{
                hasMeeting: "rdp-day_has_meeting"
              }}
            />
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
            <h2 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">
              Upcoming Session Details
            </h2>
            <div className="space-y-3">
              {meetingsOnSelectedDay.length > 0 ? (
                meetingsOnSelectedDay.map((meeting) => (
                  <motion.div
                    key={meeting.id}
                    whileHover={{ x: 4 }}
                    onClick={() => handleJoinMeeting(meeting)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer",
                      selectedMeeting?.id === meeting.id 
                        ? "bg-primary/5 border-primary shadow-sm" 
                        : "bg-slate-50 border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        selectedMeeting?.id === meeting.id ? "bg-primary animate-pulse" : "bg-slate-300"
                      )} />
                      <div>
                        <h4 className={cn("text-sm font-bold", selectedMeeting?.id === meeting.id ? "text-primary" : "text-text-main")}>
                          {meeting.title}
                        </h4>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-text-muted italic">Clear schedule for today.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RatingSystem: React.FC<{ meetingId: string; studentId?: string }> = ({ meetingId, studentId }) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = async (val: number) => {
    if (!studentId) return;
    setRating(val);
    try {
      await setDoc(doc(db, 'meetings', meetingId, 'ratings', studentId), {
        studentId,
        meetingId,
        rating: val,
        timestamp: new Date().toISOString()
      }, { merge: true });
      setSubmitted(true);
    } catch (err) {
      console.error('Rating failed', err);
    }
  };

  if (submitted) return <p className="text-sm text-green-600 font-medium italic">Thanks for the feedback!</p>;

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            className={cn(
              "text-lg transition-all",
              rating >= star ? "text-accent-devops scale-110" : "text-slate-200 hover:text-amber-200"
            )}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Rate</span>
    </div>
  );
};
