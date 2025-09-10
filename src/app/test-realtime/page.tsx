'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui'

export default function TestRealtimePage() {
  const [messages, setMessages] = useState<any[]>([])
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Not connected')
  const [testMessage, setTestMessage] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const supabase = createClient()

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    setLogs(prev => [...prev, `${timestamp}: ${message}`])
    console.log(`🔍 ${timestamp}: ${message}`)
  }

  useEffect(() => {
    addLog('Setting up real-time subscription test...')
    
    const channel = supabase
      .channel('test-messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          addLog(`✅ Real-time INSERT received: ${JSON.stringify(payload.new)}`)
          setMessages(prev => [...prev, payload.new])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', 
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          addLog(`✅ Real-time UPDATE received: ${JSON.stringify(payload.new)}`)
        }
      )
      .subscribe((status) => {
        addLog(`📡 Subscription status: ${status}`)
        setSubscriptionStatus(status)
      })

    // Load initial messages
    loadMessages()

    return () => {
      addLog('🧹 Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [])

  const loadMessages = async () => {
    addLog('Loading existing messages...')
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      addLog(`❌ Error loading messages: ${error.message}`)
    } else {
      addLog(`✅ Loaded ${data?.length || 0} messages`)
      setMessages(data || [])
    }
  }

  const sendTestMessage = async () => {
    if (!testMessage.trim()) return
    
    addLog(`💬 Sending test message: "${testMessage}"`)
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: '00000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000001',
        content: testMessage,
        message_type: 'text',
        is_ai: false
      })
      .select()
      .single()

    if (error) {
      addLog(`❌ Error sending message: ${error.message}`)
    } else {
      addLog(`✅ Message sent successfully: ${data?.id}`)
      setTestMessage('')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Real-time Subscription Test</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold">Status: {subscriptionStatus}</h2>
        <p className="text-sm text-gray-600">
          This page tests if Supabase real-time subscriptions are working for the messages table.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Message Sender */}
        <div className="space-y-4">
          <h3 className="font-semibold">Send Test Message</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter test message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
              onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
            />
            <Button onClick={sendTestMessage} disabled={!testMessage.trim()}>
              Send
            </Button>
          </div>
          <Button onClick={loadMessages} variant="secondary" className="w-full">
            Reload Messages
          </Button>
        </div>

        {/* Recent Messages */}
        <div className="space-y-4">
          <h3 className="font-semibold">Recent Messages ({messages.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={msg.id || index} className="p-2 bg-white border rounded text-sm">
                <div className="font-mono text-xs text-gray-500">{msg.id}</div>
                <div>{msg.content}</div>
                <div className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Debug Logs */}
      <div className="mt-6 space-y-2">
        <h3 className="font-semibold">Debug Logs</h3>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}