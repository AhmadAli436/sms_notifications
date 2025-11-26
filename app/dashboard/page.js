'use client';

import { useState, useEffect } from 'react';
import DashboardContent from '@/components/DashboardContent';

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  return <DashboardContent user={user} />;
}

