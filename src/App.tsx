import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import PublicLayout from "@/components/PublicLayout";
import Index from "./pages/Index";
import Schedule from "./pages/Schedule";
import Standings from "./pages/Standings";
import Stats from "./pages/Stats";
import FairPlay from "./pages/FairPlay";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/standings" element={<Standings />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/fair-play" element={<FairPlay />} />
            </Route>

            {/* Auth */}
            <Route path="/login" element={<Login />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />}>
              <Route index element={<AdminHome />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
