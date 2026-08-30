import { useEffect, useRef } from 'react';

export function useBackButton(isOpen, closeFn) {
  const closeFnRef = useRef(closeFn);
  
  useEffect(() => {
    closeFnRef.current = closeFn;
  }, [closeFn]);

  useEffect(() => {
    if (isOpen) {
      const modalId = Math.random().toString(36).substring(7);
      window.history.pushState({ modalId }, '');

      const handlePopState = (e) => {
        // Only close if our specific state was popped
        if (e.state?.modalId !== modalId) {
          if (closeFnRef.current) {
            closeFnRef.current();
          }
        }
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        // If the state hasn't been popped by the browser (i.e. user didn't press back button)
        // and we are unmounting or isOpen became false, we should pop it manually.
        if (window.history.state?.modalId === modalId) {
          window.history.back();
        }
      };
    }
  }, [isOpen]);
}
