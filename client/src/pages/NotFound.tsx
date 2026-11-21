import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <div className="bg-surface-container-lowest border border-outline rounded-xl p-space-xl flex items-center justify-center text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-space-md">
              <FileText size={48} className="text-on-surface-variant" />
            </div>
            <h1 className="text-3xl font-bold text-on-surface mb-2">404</h1>
            <p className="text-on-surface-variant mb-space-lg">Page not found</p>
            <Button variant="green" onClick={() => navigate('/dashboard')} className="w-full md:w-auto">
              <ArrowLeft size={16} className="text-on-secondary mr-2" /> Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}