import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Templates from "./pages/Templates";
import CaseLaw from "./pages/CaseLaw";
import Documents from "./pages/Documents";
import Admin from "./pages/Admin";
import AddModel from "./pages/AddModel";
import AddImageModel from "./pages/AddImageModel";
import Settings from "./pages/Settings";
import RecentConversations from "./pages/RecentConversations";
import LawSourceManagement from "./pages/LawSourceManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Splash />} />
                <Route path="/home" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:conversationId" element={<Chat />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/case-law" element={<CaseLaw />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/add-model" element={<AddModel />} />
                <Route path="/admin/add-image-model" element={<AddImageModel />} />
                <Route path="/admin/law-sources" element={<LawSourceManagement />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/recent-conversations" element={<RecentConversations />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
