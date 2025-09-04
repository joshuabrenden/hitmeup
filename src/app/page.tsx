import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brutal-white p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-6xl text-brutal-black">
              HITMEUP
            </CardTitle>
            <p className="text-xl font-bold text-brutal-black">
              INVITE-ONLY MESSAGING WITH AI ASSISTANT JIMMY
            </p>
          </CardHeader>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>FEATURES</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="success">NEW</Badge>
                <span className="font-bold">Invite-Only Access</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">AI</Badge>
                <span className="font-bold">Chat with @Jimmy</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">REAL-TIME</Badge>
                <span className="font-bold">Live Messaging</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">ADMIN</Badge>
                <span className="font-bold">Analytics Dashboard</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GET STARTED</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-bold">
                You need an invitation link to join a conversation.
              </p>
              <p>
                Once inside, you can chat with other users and mention @Jimmy for AI assistance powered by Claude 3.5 Haiku.
              </p>
              <div className="space-y-2">
                <Button className="w-full" disabled>
                  WAITING FOR INVITE
                </Button>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    ADMIN LOGIN
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}