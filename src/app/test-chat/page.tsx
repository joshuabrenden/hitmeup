'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';

export default function TestChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, user: 'JJ', content: 'Welcome JJ and CC! 🎉 This is your private chat room. Try mentioning @jimmy to test the AI assistant!', timestamp: new Date() },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState('JJ'); // Default to JJ, can be switched

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      user: currentUser,
      content: newMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Check if message mentions @jimmy
    if (messageContent.toLowerCase().includes('@jimmy')) {
      // Add typing indicator
      const typingMessage = {
        id: Date.now() + 1,
        user: 'Jimmy (AI)',
        content: 'Jimmy is typing...',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, typingMessage]);

      try {
        // Call the AI endpoint
        const response = await fetch('/api/ai/jimmy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageContent,
            conversationId: 'test-chat',
            userId: currentUser === 'JJ' ? 'jj-test' : 'cc-test'
          }),
        });

        const data = await response.json();
        
        // Replace typing message with AI response
        const aiMessage = {
          id: Date.now() + 2,
          user: 'Jimmy (AI)',
          content: data.response || 'Sorry, I had trouble responding to that.',
          timestamp: new Date()
        };
        
        setMessages(prev => prev.map(msg => 
          msg.content === 'Jimmy is typing...' ? aiMessage : msg
        ));
      } catch (error) {
        console.error('AI response error:', error);
        // Replace typing message with error
        const errorMessage = {
          id: Date.now() + 2,
          user: 'Jimmy (AI)',
          content: 'Sorry, I\'m having technical difficulties right now.',
          timestamp: new Date()
        };
        
        setMessages(prev => prev.map(msg => 
          msg.content === 'Jimmy is typing...' ? errorMessage : msg
        ));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-brutal-white p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-4xl text-brutal-black">
              HITMEUP TEST CHAT
            </CardTitle>
            <p className="font-bold text-brutal-black">JJ & CC PRIVATE ROOM</p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>USERS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div 
                  className={`p-2 border-2 border-brutal-black cursor-pointer ${currentUser === 'JJ' ? 'bg-brutal-yellow' : 'bg-white'}`}
                  onClick={() => setCurrentUser('JJ')}
                >
                  <strong>JJ</strong> (You)
                </div>
                <div 
                  className={`p-2 border-2 border-brutal-black cursor-pointer ${currentUser === 'CC' ? 'bg-brutal-pink' : 'bg-white'}`}
                  onClick={() => setCurrentUser('CC')}
                >
                  <strong>CC</strong> (Christy)
                </div>
                <div className="text-sm text-gray-600 pt-2">
                  Click to switch who you're sending as
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>MESSAGES</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`border-2 border-brutal-black p-4 ${message.user.includes('Jimmy') ? 'bg-green-50' : ''}`}>
                      <div className="flex justify-between items-start mb-2">
                        <strong className={
                          message.user === 'JJ' ? 'text-brutal-blue' : 
                          message.user === 'CC' ? 'text-brutal-pink' : 
                          'text-green-600'
                        }>
                          {message.user}
                        </strong>
                        <small className="text-gray-600">
                          {message.timestamp.toLocaleTimeString()}
                        </small>
                      </div>
                      <p>{message.content}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-bold">
                    Sending as: <span className={currentUser === 'JJ' ? 'text-brutal-blue' : 'text-brutal-pink'}>{currentUser}</span>
                  </div>
                  <Textarea
                    placeholder="Type your message... (mention @jimmy to chat with AI)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-h-20"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="w-full"
                  >
                    SEND MESSAGE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}