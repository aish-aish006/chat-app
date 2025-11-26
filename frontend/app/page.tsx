'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/chat');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-full shadow-2xl">
            <MessageCircle className="w-16 h-16 text-purple-600" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg">
            Welcome to ChatApp
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            Real-time messaging made simple and beautiful
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto text-lg px-8 bg-white text-purple-600 hover:bg-gray-100">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">⚡ Real-time</h3>
            <p className="text-sm text-white/80">Instant messaging with WebSocket technology</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">🔒 Secure</h3>
            <p className="text-sm text-white/80">End-to-end encrypted conversations</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <h3 className="font-bold text-lg mb-2">💬 Group Chat</h3>
            <p className="text-sm text-white/80">Create rooms and chat with multiple friends</p>
          </div>
        </div>
      </div>
    </div>
  );
}