import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plane,
  Hotel,
  Calendar,
  MapPin,
  Bell,
  ChevronDown,
  Briefcase,
  Heart,
  MessageSquare,
  X,
  CheckCircle2,
  Coffee,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { RoomLayoutVariant } from "@/lib/roomLayoutVariant";
import roomPick1 from "../../../pic/room1.png";
import roomPick2 from "../../../pic/room2.png";

type TabType = "saved" | "booked" | "past";

interface Trip {
  id: string;
  type: TabType;
  destination: string;
  image: string;
  description?: string;
  hotelName?: string;
  flightSummary?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

const MOCK_TRIPS: Trip[] = [
  {
    id: "1",
    type: "booked",
    destination: "Paris, France",
    image:
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=800",
    hotelName: "Le Meurice",
    flightSummary: "AF 1234 • Nonstop • 8h 15m",
    startDate: "Apr 14",
    endDate: "Apr 20, 2026",
    status: "Confirmed",
  },
  {
    id: "2",
    type: "booked",
    destination: "Tokyo, Japan",
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=800",
    hotelName: "Aman Tokyo",
    flightSummary: "JL 007 • 1 Stop • 14h 30m",
    startDate: "Oct 02",
    endDate: "Oct 14, 2026",
    status: "Confirmed",
  },
  {
    id: "3",
    type: "saved",
    destination: "Santorini, Greece",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800",
    description:
      "Explore the beautiful white and blue architecture and stunning sunsets.",
  },
  {
    id: "4",
    type: "saved",
    destination: "Banff National Park, Canada",
    image:
      "https://images.unsplash.com/photo-1513553404607-988bf2703777?auto=format&fit=crop&q=80&w=800",
    description: "A nature lover's paradise with turquoise lakes and majestic mountains.",
  },
  {
    id: "5",
    type: "past",
    destination: "New York City, USA",
    image:
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=800",
    hotelName: "The Plaza",
    startDate: "Dec 15",
    endDate: "Dec 20, 2025",
    status: "Completed",
  },
  {
    id: "6",
    type: "past",
    destination: "Rome, Italy",
    image:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=800",
    hotelName: "Hotel Hassler",
    startDate: "Sep 05",
    endDate: "Sep 12, 2025",
    status: "Completed",
  },
];

type CurrentUser = {
  displayName: string;
  avatar: string;
};

const HomeNavbar = ({
  currentUser,
  onOpenProfile,
  hasRoomSticker,
}: {
  currentUser: CurrentUser;
  onOpenProfile: () => void;
  hasRoomSticker: boolean;
}) => (
  <nav className="sticky top-0 z-50 bg-brand-bg/90 backdrop-blur-md border-b border-transparent">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-20 items-center">
        <div className="flex items-center">
          <div className="flex-shrink-0 flex items-center cursor-pointer bg-white border border-gray-200 rounded-full py-1.5 pr-4 pl-1.5 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-brand-dark text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm">
              F
            </div>
            <span className="ml-2.5 text-sm font-bold text-brand-dark tracking-tight">Five Stars Only</span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <span className="text-brand-dark font-medium text-sm flex items-center">
            <Briefcase className="h-4 w-4 mr-1.5" />
            Trips
          </span>
          <span className="text-brand-muted font-medium text-sm flex items-center cursor-default">
            <Heart className="h-4 w-4 mr-1.5" />
            Deals
          </span>
          <span className="text-brand-muted font-medium text-sm flex items-center cursor-default">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Support
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onOpenProfile}
            className={cn(
              "relative flex items-center cursor-pointer hover:bg-white/50 p-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/30",
              hasRoomSticker && "ring-2 ring-brand-dark/35 ring-offset-2 ring-offset-brand-bg"
            )}
            aria-label={hasRoomSticker ? "Profile — room layout saved" : "Profile"}
          >
            <Avatar className="h-8 w-8 border border-gray-200">
              <AvatarImage src={currentUser.avatar} alt="" />
              <AvatarFallback className="bg-brand-dark text-white text-xs">
                {currentUser.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-brand-muted ml-1" />
          </button>
        </div>
      </div>
    </div>
  </nav>
);

const TripCard = ({
  trip,
  onOpenGuestReviews,
  onOpenReviewing,
}: {
  trip: Trip;
  onOpenGuestReviews: () => void;
  onOpenReviewing: () => void;
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 group flex flex-col sm:flex-row h-full sm:h-64"
    >
      <div className="sm:w-2/5 h-48 sm:h-full relative overflow-hidden p-3 pb-0 sm:pb-3 sm:pr-0">
        <div className="w-full h-full rounded-2xl overflow-hidden relative">
          <img
            src={trip.image}
            alt={trip.destination}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          {trip.type === "booked" && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-brand-dark border border-gray-200 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
              {trip.status}
            </div>
          )}
          {trip.type === "past" && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-brand-muted border border-gray-200 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
              {trip.status}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="text-2xl font-bold text-brand-dark mb-2 tracking-tight">{trip.destination}</h3>

          {trip.type === "saved" && trip.description && (
            <p className="text-brand-muted text-sm line-clamp-2 mt-2 leading-relaxed">{trip.description}</p>
          )}

          {(trip.type === "booked" || trip.type === "past") && (
            <div className="flex items-center text-brand-muted text-sm mt-3 mb-4">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <span>
                {trip.startDate} – {trip.endDate}
              </span>
            </div>
          )}

          {trip.hotelName && (
            <div className="flex items-center text-brand-muted text-sm mt-2">
              <Hotel className="h-4 w-4 mr-2 text-gray-400" />
              <span>{trip.hotelName}</span>
            </div>
          )}

          {trip.flightSummary && (
            <div className="flex items-center text-brand-muted text-sm mt-2">
              <Plane className="h-4 w-4 mr-2 text-gray-400" />
              <span>{trip.flightSummary}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {trip.type === "saved" && (
            <button
              type="button"
              onClick={onOpenGuestReviews}
              className="bg-brand-dark hover:bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors w-full sm:w-auto"
            >
              Guest reviews
            </button>
          )}

          {trip.type === "booked" && (
            <button
              type="button"
              onClick={onOpenGuestReviews}
              className="bg-brand-dark hover:bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors w-full sm:w-auto"
            >
              Guest reviews
            </button>
          )}

          {trip.type === "past" && (
            <button
              type="button"
              onClick={onOpenReviewing}
              className="bg-brand-dark hover:bg-black text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors w-full sm:w-auto"
            >
              Rate your stay
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ activeTab }: { activeTab: TabType }) => {
  const messages = {
    saved: {
      title: "No saved trips yet",
      desc: "Start dreaming and save your favorite destinations here.",
    },
    booked: {
      title: "No upcoming trips",
      desc: "Where to next? Start planning your next adventure.",
    },
    past: {
      title: "No past trips",
      desc: "Your completed journeys will appear here.",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-3xl border border-gray-200 shadow-sm"
    >
      <div className="bg-white border border-gray-200 p-5 rounded-full mb-6 shadow-sm">
        <MapPin className="h-10 w-10 text-brand-dark" />
      </div>
      <h3 className="text-2xl font-bold text-brand-dark mb-3 tracking-tight">{messages[activeTab].title}</h3>
      <p className="text-brand-muted max-w-md mb-8 text-lg">{messages[activeTab].desc}</p>
      <button
        type="button"
        className="bg-brand-dark hover:bg-black text-white px-8 py-3 rounded-full font-medium transition-colors shadow-sm hover:shadow"
      >
        Start exploring
      </button>
    </motion.div>
  );
};

const EarlyFeedbackWidget = ({
  onRoomLayoutSelected,
}: {
  onRoomLayoutSelected?: (layout: RoomLayoutVariant) => void;
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [step, setStep] = useState(0);

  if (!isVisible) return null;

  const moods = [
    { id: "great", emoji: "🤩", label: "Great" },
    { id: "good", emoji: "🙂", label: "Good" },
    { id: "okay", emoji: "😐", label: "Okay" },
    { id: "bad", emoji: "🙁", label: "Not great" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      className="fixed bottom-6 left-6 z-50 w-[22rem] max-w-[calc(100vw-3rem)] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 overflow-hidden"
    >
      {step !== -1 && (
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-brand-dark transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="p-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col"
            >
              <h4 className="text-lg font-bold text-brand-dark mb-1">Ready to play?</h4>
              <p className="text-sm text-brand-muted mb-5">
                Unlock your stay&apos;s little room game—stickers, props, and surprises ahead.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full bg-brand-dark hover:bg-black text-white py-2.5 rounded-full text-sm font-medium transition-colors"
                >
                  Yes, just arrived
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(-1);
                    window.setTimeout(() => setIsVisible(false), 3500);
                  }}
                  className="w-full bg-white hover:bg-gray-50 text-brand-dark border border-gray-200 py-2.5 rounded-full text-sm font-medium transition-colors"
                >
                  Not yet
                </button>
              </div>
            </motion.div>
          )}

          {step === -1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-6 text-center"
            >
              <div className="h-12 w-12 bg-brand-bg text-brand-dark rounded-full flex items-center justify-center mb-4">
                <Coffee className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-brand-dark mb-2 leading-tight">
                No rush—we&apos;ll ping you when it&apos;s game time.
              </h4>
              <p className="text-sm text-brand-muted">Your room stage will be waiting.</p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col"
            >
              <h4 className="text-lg font-bold text-brand-dark mb-1">What&apos;s your vibe?</h4>
              <p className="text-xs text-brand-muted mb-3">Quick pulse—just for fun, not a review.</p>
              <div className="flex justify-between gap-1">
                {moods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-gray-50 transition-colors flex-1"
                  >
                    <span className="text-3xl">{m.emoji}</span>
                    <span className="text-xs font-medium text-brand-muted">{m.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2-layout"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col"
            >
              <h4 className="text-lg font-bold text-brand-dark mb-1">Pick your room stage</h4>
              <p className="text-xs text-brand-muted mb-4 leading-relaxed">
                This is your playable floor—two looks, two moods. Tap one to lock your map; furniture and icons will
                match that art style in the mini-game.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onRoomLayoutSelected?.("room1");
                    setStep(3);
                  }}
                  className="flex flex-col gap-1.5 rounded-2xl border border-gray-200 p-2 hover:border-brand-dark hover:bg-gray-50/80 transition-colors text-left"
                >
                  <img
                    src={roomPick1}
                    alt="Stage 1 floor plan"
                    className="w-full aspect-square object-cover rounded-xl bg-gray-100"
                  />
                  <span className="text-xs font-semibold text-brand-dark text-center">Stage 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRoomLayoutSelected?.("room2");
                    setStep(3);
                  }}
                  className="flex flex-col gap-1.5 rounded-2xl border border-gray-200 p-2 hover:border-brand-dark hover:bg-gray-50/80 transition-colors text-left"
                >
                  <img
                    src={roomPick2}
                    alt="Stage 2 floor plan"
                    className="w-full aspect-square object-cover rounded-xl bg-gray-100"
                  />
                  <span className="text-xs font-semibold text-brand-dark text-center">Stage 2</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-6 text-center"
            >
              <div className="h-12 w-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-lg font-bold text-brand-dark mb-1">Stage unlocked!</h4>
              <p className="text-sm text-brand-muted leading-relaxed">
                Your room map is live. Drop in after you check out to decorate your room!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export function MyTripsHomePage({
  currentUser,
  onOpenGuestReviews,
  onOpenReviewing,
  onOpenProfile,
  hasRoomSticker,
  onRoomLayoutSelected,
}: {
  currentUser: CurrentUser;
  onOpenGuestReviews: () => void;
  onOpenReviewing: () => void;
  onOpenProfile: () => void;
  hasRoomSticker: boolean;
  onRoomLayoutSelected?: (layout: RoomLayoutVariant) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("booked");

  const tabs: { id: TabType; label: string }[] = [
    { id: "saved", label: "Saved" },
    { id: "booked", label: "Booked" },
    { id: "past", label: "Past" },
  ];

  const filteredTrips = MOCK_TRIPS.filter((trip) => trip.type === activeTab);

  const today = new Date();
  const hasCurrentStay = filteredTrips.some((trip) => {
    if (!trip.startDate || !trip.endDate) return false;
    const yearMatch = trip.endDate.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : String(today.getFullYear());
    const startDate = new Date(`${trip.startDate}, ${year}`);
    startDate.setHours(0, 0, 0, 0);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    return startDate <= currentDate;
  });

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-dark selection:bg-brand-dark selection:text-white">
      <HomeNavbar currentUser={currentUser} onOpenProfile={onOpenProfile} hasRoomSticker={hasRoomSticker} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-dark tracking-tight mb-3">My Trips</h1>
        </div>

        <div className="border-b border-gray-200 mb-10">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative whitespace-nowrap py-4 px-1 text-base font-medium transition-colors",
                    isActive ? "text-brand-dark" : "text-brand-muted hover:text-brand-dark"
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-dark"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {filteredTrips.length > 0 ? (
              <motion.div
                key={`list-${activeTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 gap-6"
              >
                {filteredTrips.map((trip) => (
                  <div key={trip.id}>
                    <TripCard
                      trip={trip}
                      onOpenGuestReviews={onOpenGuestReviews}
                      onOpenReviewing={onOpenReviewing}
                    />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`empty-${activeTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <EmptyState activeTab={activeTab} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {activeTab === "booked" && hasCurrentStay && (
        <EarlyFeedbackWidget onRoomLayoutSelected={onRoomLayoutSelected} />
      )}
    </div>
  );
}
