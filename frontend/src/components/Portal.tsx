import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

const Portal: React.FC<PortalProps> = ({ children, containerId = 'portal-root' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Create portal container if it doesn't exist
    let portalRoot = document.getElementById(containerId);
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.setAttribute('id', containerId);
      document.body.appendChild(portalRoot);
    }

    return () => setMounted(false);
  }, [containerId]);

  if (!mounted) return null;

  const portalRoot = document.getElementById(containerId);
  if (!portalRoot) return null;

  return createPortal(children, portalRoot);
};

export default Portal;
