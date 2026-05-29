import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { PageLoader } from '@/components/common/PageLoader';
import { storePasswordResetCode } from '@/components/providers/AuthProvider';

function getParam(name: string) {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return searchParams.get(name) || hashParams.get(name);
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const handleAuthCallback = async () => {
      const errorMessage = getParam('error_description') || getParam('error');
      if (errorMessage) {
        navigate(`/auth/error?msg=${encodeURIComponent(errorMessage)}`, { replace: true });
        return;
      }

      try {
        const mode = getParam('mode');
        const oobCode = getParam('oobCode');

        if (mode === 'resetPassword' && oobCode) {
          storePasswordResetCode(oobCode);
          navigate('/auth/reset-password', { replace: true });
          return;
        }

        if (mode === 'verifyEmail' && oobCode) {
          await applyActionCode(auth, oobCode);
        }

        if (!active) return;
        navigate('/dashboard', { replace: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر إكمال المصادقة';
        navigate(`/auth/error?msg=${encodeURIComponent(message)}`, { replace: true });
      }
    };

    handleAuthCallback();

    return () => {
      active = false;
    };
  }, [navigate]);

  return <PageLoader label="جاري معالجة المصادقة..." />;
}
