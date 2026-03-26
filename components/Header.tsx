import React, { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Theme } from "../hooks/useTheme";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, onThemeChange, user, onSignIn, onSignOut, onLogoClick }) => {
  const [imageError, setImageError] = useState(false);

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.id]);

  // Get initials from user name
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="border-b bg-white dark:bg-slate-800 backdrop-blur supports-[backdrop-filter]:bg-card/80 sticky top-0 z-[60] shadow-sm">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo - Clickeable */}
          <button
            onClick={onLogoClick}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Nuevo video"
          >
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <div className="text-left">
              <h1 className="text-base font-semibold text-foreground">Momentum Render</h1>
              <p className="text-xs text-muted-foreground">Generador de Videos con IA</p>
            </div>
          </button>

          {/* Right side: Theme Toggle + User */}
          <div className="flex items-center space-x-3">
            <ThemeToggle theme={theme} onThemeChange={onThemeChange} />

            {user ? (
              <div className="flex items-center space-x-2">
                {user.user_metadata?.avatar_url && !imageError ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata?.name || user.email || 'User'}
                    className="w-8 h-8 rounded-full border-2 border-border object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-border bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {getInitials(user.user_metadata?.name || user.email?.split('@')[0] || null)}
                    </span>
                  </div>
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-foreground">{user.user_metadata?.name || user.email?.split('@')[0]}</p>
                </div>
                <button
                  onClick={onSignOut}
                  className="text-xs px-3 py-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="text-sm px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium shadow-sm"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
