import { Bell, Briefcase, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ExpediaAppView = "guest-reviews" | "reviewing";

type CurrentUser = {
  displayName: string;
  avatar: string;
};

export function ExpediaAppNav({
  activeView,
  currentUser,
  onHome,
  onGuestReviews,
  onReviewing,
  onOpenProfile,
  hasRoomSticker,
}: {
  activeView: ExpediaAppView;
  currentUser: CurrentUser;
  onHome: () => void;
  onGuestReviews: () => void;
  onReviewing: () => void;
  onOpenProfile: () => void;
  hasRoomSticker: boolean;
}) {
  const link = (isActive: boolean) =>
    cn(
      "text-sm font-medium transition-colors rounded-full px-3 py-1.5",
      isActive ? "bg-white text-brand-dark shadow-sm border border-gray-200" : "text-brand-muted hover:text-brand-dark"
    );

  return (
    <nav className="sticky top-0 z-50 bg-brand-bg/95 backdrop-blur-md border-b border-gray-200/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          <button
            type="button"
            onClick={onHome}
            className="flex-shrink-0 flex items-center cursor-pointer bg-white border border-gray-200 rounded-full py-1.5 pr-4 pl-1.5 shadow-sm hover:shadow-md transition-shadow"
            aria-label="Back to My trips"
          >
            <div className="bg-brand-dark text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
              F
            </div>
            <span className="ml-2.5 text-sm font-bold text-brand-dark tracking-tight">Five Stars Only</span>
          </button>

          <div className="hidden md:flex items-center gap-1">
            <button type="button" className={link(false)} onClick={onHome}>
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                My trips
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              data-room-sticker-avatar-target="true"
              className={cn(
                "relative flex items-center cursor-pointer rounded-full p-1 pr-2 hover:bg-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/25",
                hasRoomSticker && "ring-2 ring-brand-dark/30 ring-offset-2 ring-offset-brand-bg"
              )}
              aria-label={hasRoomSticker ? "Profile — room layout saved" : "Profile"}
            >
              <Avatar className="h-8 w-8 border border-gray-200">
                <AvatarImage src={currentUser.avatar} alt="" />
                <AvatarFallback className="bg-brand-dark text-white text-xs">
                  {currentUser.displayName[0]}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-brand-muted ml-0.5 hidden sm:block" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
