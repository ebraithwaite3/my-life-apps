import { useState, useEffect } from 'react';

/**
 * Simple test hook to verify package connection
 * Returns a success message after 1 second
 */
export const useTestHook = () => {
  const [message, setMessage] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🎯 useTestHook mounted!');
    
    const timer = setTimeout(() => {
      setMessage('✅ Firestore subscriptions package connected successfully!');
      setLoading(false);
      console.log('✅ Test hook completed');
    }, 1000);

    return () => {
      console.log('🧹 useTestHook cleanup');
      clearTimeout(timer);
    };
  }, []);

  return { message, loading };
};