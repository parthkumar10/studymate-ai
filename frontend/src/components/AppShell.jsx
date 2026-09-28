import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { BookOpenText, History, LayoutDashboard, LogOut, Moon, Sun } from "lucide-react";
import { AiSettingsDialog } from "@/components/AiSettingsDialog";

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/history", label: "History", icon: History, testid: "nav-history" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 group" data-testid="brand-logo">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-translate-y-0.5">
              <BookOpenText className="w-5 h-5" />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground">StudyMate</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={item.testid}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <div className="mx-1 sm:mx-2 h-6 w-px bg-border" />
            <AiSettingsDialog />
            <button
              onClick={toggle}
              data-testid="theme-toggle-button"
              aria-label="Toggle dark mode"
              className="grid place-items-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className="hidden md:inline text-sm text-muted-foreground max-w-[140px] truncate" data-testid="nav-user-name">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              data-testid="logout-button"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

export const TYPE_META = {
  summary: { label: "Summary", chip: "bg-[#E0F2FE] text-[#075985]" },
  flashcards: { label: "Flashcards", chip: "bg-[#FEF3C7] text-[#92400e]" },
  quiz: { label: "Quiz", chip: "bg-[#EAF2EC] text-[#2D4E37]" },
};

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
