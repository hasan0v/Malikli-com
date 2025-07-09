// hooks/useAuth.ts
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

export const useAuth = () => {
  const auth = useSelector((state: RootState) => state.auth);
  
  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    token: auth.token,
    error: auth.error,
  };
};
