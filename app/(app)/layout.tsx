import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TelemetryProvider } from "@/context/TelemetryContext";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
      <TelemetryProvider>
        <div className="h-dvh overflow-hidden bg-zinc-950 flex flex-col">
          <Navbar />
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
              <OnboardingFlow />
              {children}
            </main>
          </div>
        </div>
      </TelemetryProvider>
  );
}
