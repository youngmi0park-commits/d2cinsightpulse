import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import ToolkitPage from "./pages/ToolkitPage";
import FaqGenPage from "./pages/FaqGenPage";
import RedditPage from "./pages/RedditPage";
import LgComPage from "./pages/LgComPage";
import CollectionPage from "./pages/CollectionPage";
import NewsletterPage from "./pages/NewsletterPage";
import CommunitiesPage from "./pages/CommunitiesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 overflow-hidden">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/reddit" element={<RedditPage />} />
                    <Route path="/lgcom" element={<LgComPage />} />
                    <Route path="/collection" element={<CollectionPage />} />
                    <Route path="/newsletter" element={<NewsletterPage />} />
                    <Route path="/communities" element={<CommunitiesPage />} />
                    <Route path="/toolkit" element={<ToolkitPage />} />
                    <Route path="/faq-gen" element={<FaqGenPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
