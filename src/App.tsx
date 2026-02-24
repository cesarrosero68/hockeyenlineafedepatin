import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useRealtimeUpdates } from "@/hooks/use-realtime";
import PublicLayout from "@/components/PublicLayout";

// Lazy-loaded pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Teams = lazy(() => import("./pages/Teams"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Standings = lazy(() => import("./pages/Standings"));
const Stats = lazy(() => import("./pages/Stats"));
const FairPlay = lazy(() => import("./pages/FairPlay"));
const MatchDetail = lazy(() => import("./pages/MatchDetail"));
const Login = lazy(() => import("./pages/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminMatches = lazy(() => import("./pages/admin/AdminMatches"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeUpdates();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RealtimeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/standings" element={<Standings />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/fair-play" element={<FairPlay />} />
                  <Route path="/match/:id" element={<MatchDetail />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboard />}>
                    <Route index element={<AdminHome />} />
                    <Route path="matches" element={<AdminMatches />} />
                  </Route>
                </Route>

                <Route path="/login" element={<Login />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
