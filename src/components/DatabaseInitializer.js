import { useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

const DatabaseInitializer = () => {
  const initializeDatabase = useAction(api.init.initializeDatabase);

  useEffect(() => {
    const initDb = async () => {
      try {
        await initializeDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    initDb();
  }, [initializeDatabase]);

  return null; // This component doesn't render anything
};

export default DatabaseInitializer; 