'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { assetAPI, type Asset } from '@/services/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssetEditPage() {
  const { assetId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (assetId) {
      // Redirect to main assets page with edit mode
      router.replace(`/dashboard/assets?edit=${assetId}`);
    }
  }, [assetId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600">Redirecting to edit mode...</p>
        <Button 
          onClick={() => router.push('/dashboard/assets')} 
          className="mt-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Assets
        </Button>
      </div>
    </div>
  );
}
