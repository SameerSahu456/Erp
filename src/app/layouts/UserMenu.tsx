import { LogOut, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OverflowPillList } from "@/components/common/display/OverflowPillList";
import { Typography } from "@/components/ui/typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@shared/auth/use-auth";
import { fullName } from "@shared/auth/AuthContext";

function deriveInitials(source: string): string {
  return source
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserMenu() {
  const { user, logout } = useAuth();

  // Explicit sign-out does a FULL reload to a clean /login, not a soft navigate.
  // A soft navigate races the route guard: the instant `logout()` clears the
  // session, RequireAuth can re-render on the still-current protected URL and
  // capture it as `from`, so the next user gets bounced back to the previous
  // user's page. A hard reload boots the app fresh at /login with no in-memory
  // router state (no `from`), so the next login lands on "/" and HomeRedirect
  // sends each role to its own landing (e.g. L1 engineer → Inspection).
  const handleSignOut = () => {
    logout(); // clears the token + user from localStorage synchronously
    window.location.assign("/login");
  };

  if (!user) {
    return (
      <Link
        to="/login"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const displayName = fullName(user);
  const initials = deriveInitials(displayName) || user.email.slice(0, 2).toUpperCase();
  const roles = user.roles ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/60 transition-all" />
        }
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden lg:flex flex-col items-start">
          <Typography variant="body-strong" asChild><span>{displayName}</span></Typography>
          {roles.length > 0 && (
            <OverflowPillList items={roles} getItemLabel={(role) => role} />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div>
              <Typography variant="body-strong" truncate>{displayName}</Typography>
              <Typography variant="helper" truncate asChild><p>{user.email}</p></Typography>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/settings/profile" />}>
            <User className="h-4 w-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/settings/app" />}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
