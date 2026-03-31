import { Store, MessageSquare, Globe, Wrench, BarChart3, Activity, Mail, Languages, HelpCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useLang } from "@/contexts/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const analyticsItems = [
  { title: "LG.com Insights", url: "/lgcom", icon: Store },
  { title: "Reddit Intelligence", url: "/reddit", icon: MessageSquare },
  { title: "Other Communities", url: "/communities", icon: Globe },
];

const marketingItems = [
  { title: "Marketing Asset Studio", url: "/toolkit", icon: Wrench, isNew: true },
  { title: "Onsite FAQ", url: "/faq-gen", icon: HelpCircle },
];

const pipelineItems = [
  { title: "Collection Criteria", url: "/collection", icon: BarChart3 },
  { title: "Newsletter", url: "/newsletter", icon: Mail },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, toggleLang } = useLang();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      style={{
        "--sidebar-background": "0 0% 7%",
        "--sidebar-foreground": "0 0% 70%",
        "--sidebar-border": "0 0% 15%",
        "--sidebar-accent": "0 0% 12%",
        "--sidebar-accent-foreground": "0 0% 100%",
        "--sidebar-primary": "4 58% 44%",
        "--sidebar-primary-foreground": "0 0% 100%",
      } as React.CSSProperties}
    >
      {/* Header */}
      <SidebarHeader className="p-4 pb-3 border-b border-[hsl(0,0%,15%)]">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity">
          <Activity className="h-5 w-5 text-[hsl(4,58%,44%)] shrink-0" />
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                <span className="text-white">D2C </span>
                <span className="text-[hsl(4,58%,44%)]">Insight</span>
                <span className="text-white"> Pulse</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-[hsl(0,0%,50%)]">
                  Live · 07:00 KST auto-collect
                </span>
              </div>
            </div>
          )}
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 space-y-5">
        {/* ANALYTICS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.15em] text-[hsl(0,0%,40%)] uppercase px-3 mb-1">
            {!collapsed && "📊 ANALYTICS"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} className="text-[13px] relative">
                      <NavLink
                        to={item.url}
                        end
                        className={`rounded-md px-3 py-2 transition-all ${
                          active
                            ? "text-white bg-[hsl(0,0%,14%)] border-l-2 border-[hsl(4,58%,44%)] ml-0 pl-2.5"
                            : "text-[hsl(0,0%,55%)] hover:text-white hover:bg-[hsl(0,0%,12%)]"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* MARKETING INSIGHTS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.15em] text-[hsl(0,0%,40%)] uppercase px-3 mb-1">
            {!collapsed && "🚀 MKT COPY GENERATION"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketingItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} className="text-[13px]">
                      <NavLink
                        to={item.url}
                        end
                        className={`rounded-md px-3 py-2 transition-all ${
                          active
                            ? "text-white bg-[hsl(0,0%,14%)] border-l-2 border-[hsl(4,58%,44%)] ml-0 pl-2.5"
                            : "text-[hsl(0,0%,55%)] hover:text-white hover:bg-[hsl(0,0%,12%)]"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {item.isNew && (
                              <span className="text-[9px] bg-[hsl(4,58%,44%)] text-white px-1.5 py-0.5 rounded font-bold leading-none">
                                NEW
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* DATA PIPELINE */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.15em] text-[hsl(0,0%,40%)] uppercase px-3 mb-1">
            {!collapsed && "⚙️ DATA PIPELINE"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pipelineItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} className="text-[13px]">
                      <NavLink
                        to={item.url}
                        end
                        className={`rounded-md px-3 py-2 transition-all ${
                          active
                            ? "text-white bg-[hsl(0,0%,14%)] border-l-2 border-[hsl(4,58%,44%)] ml-0 pl-2.5"
                            : "text-[hsl(0,0%,55%)] hover:text-white hover:bg-[hsl(0,0%,12%)]"
                        }`}
                        activeClassName=""
                      >
                        <item.icon className="h-4 w-4 mr-2.5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="p-3 border-t border-[hsl(0,0%,15%)]">
          <button
            onClick={toggleLang}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium text-[hsl(0,0%,55%)] hover:text-white hover:bg-[hsl(0,0%,12%)] transition-colors"
          >
            <Languages className="h-4 w-4 shrink-0" />
            {lang === "ko" ? "English" : "한국어"}
          </button>
          <p className="text-[9px] text-[hsl(0,0%,35%)] text-center leading-relaxed mt-1">
            D2C Marketing Strategy Team
          </p>
        </SidebarFooter>
      )}
      {collapsed && (
        <SidebarFooter className="p-2 border-t border-[hsl(0,0%,15%)]">
          <button
            onClick={toggleLang}
            className="flex items-center justify-center p-2 rounded-md text-[hsl(0,0%,55%)] hover:text-white hover:bg-[hsl(0,0%,12%)] transition-colors"
            title={lang === "ko" ? "English" : "한국어"}
          >
            <Languages className="h-4 w-4" />
          </button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
