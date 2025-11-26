'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, PhoneOff } from 'lucide-react';

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  userName: string;
}

export default function VideoCall({ isOpen, onClose, roomName }: VideoCallProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [callUrl, setCallUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    async function loadRoom() {
      try {
        setIsLoading(true);
        // 🔥 Always fetch from your backend — no local generation
        const res = await fetch('http://localhost:5000/api/video/get-room');
        const data = await res.json();
        setCallUrl(data.url);
      } catch (err) {
        console.error('Error fetching room:', err);
        alert('Could not load video call.');
        onClose();
      } finally {
        setIsLoading(false);
      }
    }

    loadRoom();
  }, [isOpen, onClose]);

  const handleClose = () => {
    setCallUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              <span>Video Call - {roomName}</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleClose}>
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-white">
              Loading video call...
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src="https://daily.co/hello"//  👈 this is the static URL from backend
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full"
            />  
          )}
        </div>

        <div className="text-xs text-gray-500 text-center mt-2">
          Connected to Daily.co via your static free room
        </div>
      </DialogContent>
    </Dialog>
  );
}
