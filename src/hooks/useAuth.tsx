import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Use real-time listener for profile
        const userDoc = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userDoc, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            const newProfile = {
              uid: user.uid,
              email: user.email,
              role: user.email === 'mavbharath01@gmail.com' ? 'admin' : 'student',
              hasVideoAccess: false,
              groups: [],
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDoc, newProfile);
            setProfile(newProfile);
          }
          setLoading(false);
        }, (err) => {
          console.error('Profile listener error', err);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin' || user?.email === 'mavbharath01@gmail.com' 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
