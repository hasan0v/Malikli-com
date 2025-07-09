// src/components/Layout/Layout.tsx
import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
// Import Redux Provider if setting it up here for client components (App Router)
// import StoreProvider from '@/app/StoreProvider'; // Example path for Redux Provider

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    // <StoreProvider> // If wrapping Redux Provider here for App Router client components
      <div className="flex flex-col min-h-screen bg-brand-charcoal">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </div>
    // </StoreProvider>
  );
};

export default Layout;