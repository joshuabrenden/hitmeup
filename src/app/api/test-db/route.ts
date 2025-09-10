import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Test database connection by checking if we can query users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          message: 'Database connection failed - run database-schema.sql in Supabase SQL Editor',
          next_steps: [
            '1. Open Supabase dashboard',
            '2. Go to SQL Editor', 
            '3. Copy contents of database-schema.sql',
            '4. Execute the query',
            '5. Test with /api/verify-schema endpoint'
          ]
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful!',
      note: 'Use /api/verify-schema for complete schema verification',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database connection failed - check environment variables and Supabase setup'
      },
      { status: 500 }
    )
  }
}