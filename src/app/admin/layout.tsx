import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, Users, Shield, Database, Activity, Settings } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Admin Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="h-14 border-b flex items-center px-4 font-semibold shrink-0 gap-2">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 mr-1">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Shield className="w-5 h-5 text-primary" />
          Enterprise Admin
        </div>
        
        <div className="p-4 flex flex-col gap-2 flex-1">
          <Button variant="secondary" className="justify-start">
            <Activity className="w-4 h-4 mr-2" />
            Dashboard / Audit
          </Button>
          <Button variant="ghost" className="justify-start">
            <Users className="w-4 h-4 mr-2" />
            Organizations & Users
          </Button>
          <Button variant="ghost" className="justify-start">
            <Shield className="w-4 h-4 mr-2" />
            Roles & SSO
          </Button>
          <Button variant="ghost" className="justify-start">
            <Database className="w-4 h-4 mr-2" />
            Data Retention
          </Button>
          <Button variant="ghost" className="justify-start mt-auto">
            <Settings className="w-4 h-4 mr-2" />
            Global Settings
          </Button>
        </div>
      </div>

      {/* Admin Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
