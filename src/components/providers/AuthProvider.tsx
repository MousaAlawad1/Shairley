import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  browserLocalPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { nowIso } from '@/lib/firebase-data';

export interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuthContextValue {
  user: AuthUser | null;
  session: null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  canResetPassword: boolean;
  login: (email: string, password: string) => Promise<{ user: AuthUser | null; session: null }>;
  register: (email: string, password: string, fullName: string) => Promise<{ user: AuthUser | null; session: null }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (newPassword: string) => Promise<void>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  recoverSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_EXPIRED_EVENT = 'auth:expired';
const RESET_CODE_STORAGE_KEY = 'firebase_password_reset_code';

export function emitAuthExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

function getStoredResetCode() {
  return typeof window !== 'undefined'
    ? window.sessionStorage.getItem(RESET_CODE_STORAGE_KEY)
    : null;
}

export function storePasswordResetCode(code: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(RESET_CODE_STORAGE_KEY, code);
  }
}

export function clearStoredPasswordResetCode() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(RESET_CODE_STORAGE_KEY);
  }
}

function buildAuthUser(firebaseUser: FirebaseUser, profile?: { full_name?: string; avatar_url?: string } | null): AuthUser {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    created_at: firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime).toISOString()
      : nowIso(),
    user_metadata: {
      full_name: profile?.full_name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'مستخدم',
      avatar_url: profile?.avatar_url || firebaseUser.photoURL || undefined,
    },
  };
}

async function loadUserProfile(firebaseUser: FirebaseUser): Promise<AuthUser> {
  const profileRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(profileRef);

  const profileData = snapshot.exists()
    ? (snapshot.data() as { full_name?: string; avatar_url?: string })
    : null;

  if (!snapshot.exists()) {
    await setDoc(
      profileRef,
      {
        email: firebaseUser.email,
        full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'مستخدم',
        avatar_url: firebaseUser.photoURL || '',
        created_at: nowIso(),
        updated_at: nowIso(),
        last_login_at: nowIso(),
      },
      { merge: true }
    );
  } else {
    await updateDoc(profileRef, {
      email: firebaseUser.email,
      last_login_at: nowIso(),
      updated_at: nowIso(),
    }).catch(() => undefined);
  }

  return buildAuthUser(firebaseUser, profileData);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [canResetPassword, setCanResetPassword] = useState(Boolean(getStoredResetCode()));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    setPersistence(auth, browserLocalPersistence).catch(() => undefined);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!mountedRef.current) return;

        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const authUser = await loadUserProfile(firebaseUser);
        if (!mountedRef.current) return;

        setUser(authUser);
        setSessionExpired(false);
        setLoading(false);
      } catch (error) {
        console.warn('[AuthProvider] failed to load auth state', error);
        if (!mountedRef.current) return;
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleAuthExpired = async () => {
      const recovered = await recoverSession();
      if (!recovered && mountedRef.current) {
        setSessionExpired(true);
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  const recoverSession = useCallback(async (): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return false;

    try {
      const authUser = await loadUserProfile(firebaseUser);
      if (!mountedRef.current) return true;
      setUser(authUser);
      setSessionExpired(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password).catch((error) => {
      throw mapAuthError(error);
    });

    const authUser = await loadUserProfile(credential.user);
    if (mountedRef.current) {
      setUser(authUser);
      setSessionExpired(false);
    }

    return { user: authUser, session: null };
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password).catch((error) => {
      throw mapAuthError(error);
    });

    await updateFirebaseProfile(credential.user, {
      displayName: fullName.trim(),
    }).catch(() => undefined);

    await setDoc(
      doc(db, 'users', credential.user.uid),
      {
        email: credential.user.email,
        full_name: fullName.trim(),
        avatar_url: '',
        created_at: nowIso(),
        updated_at: nowIso(),
        last_login_at: nowIso(),
      },
      { merge: true }
    );

    const authUser = buildAuthUser(credential.user, {
      full_name: fullName.trim(),
      avatar_url: '',
    });

    if (mountedRef.current) {
      setUser(authUser);
      setSessionExpired(false);
    }

    return { user: authUser, session: null };
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
      url: `${window.location.origin}/auth/callback`,
      handleCodeInApp: true,
    }).catch((error) => {
      throw mapAuthError(error);
    });
  }, []);

  const resetPassword = useCallback(async (newPassword: string) => {
    const resetCode = getStoredResetCode();

    if (resetCode) {
      await confirmPasswordReset(auth, resetCode, newPassword).catch((error) => {
        throw mapAuthError(error);
      });
      clearStoredPasswordResetCode();
      if (mountedRef.current) {
        setCanResetPassword(false);
      }
      return;
    }

    if (!auth.currentUser) {
      throw new Error('لا توجد جلسة صالحة لتحديث كلمة المرور');
    }

    await updatePassword(auth.currentUser, newPassword).catch((error) => {
      throw mapAuthError(error);
    });
  }, []);

  const updateProfile = useCallback(async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!auth.currentUser) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    const profileRef = doc(db, 'users', auth.currentUser.uid);

    await setDoc(
      profileRef,
      {
        email: auth.currentUser.email,
        ...(updates.full_name !== undefined ? { full_name: updates.full_name } : {}),
        ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
        updated_at: nowIso(),
        updated_at_server: serverTimestamp(),
      },
      { merge: true }
    );

    await updateFirebaseProfile(auth.currentUser, {
      ...(updates.full_name !== undefined ? { displayName: updates.full_name } : {}),
      ...(updates.avatar_url !== undefined ? { photoURL: updates.avatar_url } : {}),
    }).catch(() => undefined);

    const nextUser = buildAuthUser(auth.currentUser, {
      full_name: updates.full_name ?? user?.user_metadata.full_name,
      avatar_url: updates.avatar_url ?? user?.user_metadata.avatar_url,
    });

    if (mountedRef.current) {
      setUser(nextUser);
    }
  }, [user]);

  const resendConfirmation = useCallback(async (_email: string) => {
    if (!auth.currentUser) {
      throw new Error('يجب تسجيل الدخول لإعادة إرسال رسالة التحقق');
    }
    await sendEmailVerification(auth.currentUser, {
      url: `${window.location.origin}/dashboard`,
    }).catch((error) => {
      throw mapAuthError(error);
    });
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth).catch((error) => {
      throw mapAuthError(error);
    });
    setSessionExpired(false);
    setUser(null);
  }, []);

  useEffect(() => {
    setCanResetPassword(Boolean(getStoredResetCode()));
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session: null,
    loading,
    isAuthenticated: !!user,
    sessionExpired,
    canResetPassword,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    resendConfirmation,
    recoverSession,
  }), [user, loading, sessionExpired, canResetPassword, login, register, logout, forgotPassword, resetPassword, updateProfile, resendConfirmation, recoverSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function mapAuthError(error: { code?: string; message?: string }): Error {
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    'auth/invalid-login-credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    'auth/user-not-found': 'لم يتم العثور على المستخدم',
    'auth/wrong-password': 'كلمة المرور الحالية غير صحيحة',
    'auth/email-already-in-use': 'هذا البريد مسجل مسبقاً',
    'auth/weak-password': 'كلمة المرور ضعيفة أو قصيرة جداً',
    'auth/too-many-requests': 'محاولات كثيرة جداً، حاول مرة أخرى لاحقاً',
    'auth/requires-recent-login': 'هذه العملية تحتاج إلى تسجيل دخول حديث. سجّل الخروج ثم ادخل مرة أخرى.',
    'auth/expired-action-code': 'انتهت صلاحية رابط الاستعادة',
    'auth/invalid-action-code': 'رابط الاستعادة غير صالح',
    'auth/network-request-failed': 'تعذر الاتصال بالخدمة. تحقق من الإنترنت ثم حاول مجدداً',
    'auth/missing-email': 'يرجى إدخال البريد الإلكتروني',
    'auth/missing-password': 'يرجى إدخال كلمة المرور',
  };

  const message = error.code ? messages[error.code] || error.message || 'حدث خطأ في المصادقة' : error.message || 'حدث خطأ في المصادقة';
  return new Error(message);
}
