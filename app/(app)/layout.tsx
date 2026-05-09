import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TelemetryProvider } from "@/context/TelemetryContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <TelemetryProvider>
        <div className="min-h-screen bg-zinc-950 flex flex-col">
          <Navbar />
          <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <OnboardingFlow />
              {children}
            </main>
          </div>
        </div>
      </TelemetryProvider>
    </LanguageProvider>
  );
}
