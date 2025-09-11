'use client'

import { useEffect } from 'react'

export function PWAProvider() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
        })
        .then((registration) => {
          console.log('✅ SW registered successfully:', registration.scope)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New content is available, show update notification
                    console.log('🔄 New content available, will be used when all tabs for this page are closed.')
                    
                    // You can add a custom update notification here
                    if (confirm('New version available! Reload to update?')) {
                      window.location.reload()
                    }
                  } else {
                    // Content is cached for the first time
                    console.log('📦 Content is cached for offline use.')
                  }
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('❌ SW registration failed:', error)
        })

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 SW message:', event.data)
        
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          // Handle cache update notifications
          console.log('🔄 Cache updated')
        }
      })

      // Handle app install prompt
      let deferredPrompt: any = null

      window.addEventListener('beforeinstallprompt', (e) => {
        console.log('💾 App install prompt triggered')
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault()
        // Stash the event so it can be triggered later
        deferredPrompt = e
        
        // Show custom install prompt (you can customize this)
        showInstallPrompt()
      })

      const showInstallPrompt = () => {
        // Create a subtle install prompt
        const installBanner = document.createElement('div')
        installBanner.innerHTML = `
          <div style="
            position: fixed; 
            top: 0; 
            left: 0; 
            right: 0; 
            background: linear-gradient(90deg, #3b82f6, #6366f1); 
            color: white; 
            padding: 12px; 
            text-align: center; 
            font-size: 14px; 
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          ">
            📱 Install HitMeUp for the best experience! 
            <button id="install-btn" style="
              background: rgba(255,255,255,0.2); 
              border: 1px solid rgba(255,255,255,0.3); 
              color: white; 
              padding: 4px 12px; 
              margin-left: 8px; 
              border-radius: 4px; 
              cursor: pointer;
            ">Install</button>
            <button id="dismiss-btn" style="
              background: none; 
              border: none; 
              color: white; 
              padding: 4px 8px; 
              margin-left: 4px; 
              cursor: pointer;
            ">×</button>
          </div>
        `
        
        document.body.appendChild(installBanner)

        // Handle install button click
        document.getElementById('install-btn')?.addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            console.log(`👤 User response to the install prompt: ${outcome}`)
            deferredPrompt = null
          }
          document.body.removeChild(installBanner)
        })

        // Handle dismiss button click
        document.getElementById('dismiss-btn')?.addEventListener('click', () => {
          document.body.removeChild(installBanner)
          // Don't show again for this session
          sessionStorage.setItem('install-prompt-dismissed', 'true')
        })

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          if (document.body.contains(installBanner)) {
            document.body.removeChild(installBanner)
          }
        }, 10000)
      }

      // Handle app install success
      window.addEventListener('appinstalled', () => {
        console.log('🎉 HitMeUp was installed successfully!')
        deferredPrompt = null
      })

      // Handle online/offline status
      const updateOnlineStatus = () => {
        const status = navigator.onLine ? 'online' : 'offline'
        console.log(`🌐 Connection status: ${status}`)
        
        // You can dispatch custom events here for UI updates
        document.dispatchEvent(new CustomEvent('connection-change', { 
          detail: { online: navigator.onLine } 
        }))
      }

      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)
      
      // Initial status check
      updateOnlineStatus()
    }
  }, [])

  return null // This component doesn't render anything
}