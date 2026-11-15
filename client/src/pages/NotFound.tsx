import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-primary-text mb-2">Page Not Found</h1>
        <p className="text-secondary-text mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-md hover:bg-surface-container-lowest transition-colors">
          <Home size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

