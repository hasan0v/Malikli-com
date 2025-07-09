import { useState, useCallback } from 'react';

interface UseCheckoutOptionsReturn {
  isModalOpen: boolean;
  redirectUrl: string;
  showCheckoutOptions: (url: string) => void;
  hideCheckoutOptions: () => void;
}

export const useCheckoutOptions = (): UseCheckoutOptionsReturn => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');

  const showCheckoutOptions = useCallback((url: string) => {
    setRedirectUrl(url);
    setIsModalOpen(true);
  }, []);

  const hideCheckoutOptions = useCallback(() => {
    setIsModalOpen(false);
    setRedirectUrl('');
  }, []);

  return {
    isModalOpen,
    redirectUrl,
    showCheckoutOptions,
    hideCheckoutOptions,
  };
};
