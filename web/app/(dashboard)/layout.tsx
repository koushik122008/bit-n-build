import React from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopStatusBar } from "@/components/TopStatusBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-void overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopStatusBar />
        <main className="flex-1 overflow-y-auto p-6 bg-void">
          {children}
        </main>
      </div>
    </div>
  );
}


