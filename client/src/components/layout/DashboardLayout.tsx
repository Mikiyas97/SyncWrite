import type { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface DashboardLayoutProps {
  children: ReactNode;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DashboardLayout = ({ children, searchQuery, onSearchChange }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar searchQuery={searchQuery} onSearchChange={onSearchChange} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
