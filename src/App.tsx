import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useRealtimeUpdates } from "@/hooks/use-realtime";
import PublicLayout from "@/components/PublicLayout";
import Index from "./pages/Index";
import Teams from "./pages/Teams";
import Schedule from "./pages/Schedule";
import Standings from "./pages/Standings";
import Stats from "./pages/Stats";
import FairPlay from "./pages/FairPlay";
import MatchDetail from "./pages/MatchDetail";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import AdminMatches from "./pages/admin/AdminMatches";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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

                {/* Admin Routes — nested under PublicLayout for shared header */}
                <Route path="/admin" element={<AdminDashboard />}>
                  <Route index element={<AdminHome />} />
                  <Route path="matches" element={<AdminMatches />} />
                </Route>
              </Route>

              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
