/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { motion } from "motion/react";
import { toJpeg, toPng } from "html-to-image";
import {
  Star,
  Plus,
  MoreHorizontal,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  ClipboardCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ROOM_GENERATION_MOCK } from "@/lib/roomGenerationMock";
import type { RoomItem } from "@/lib/roomGenerationTypes";
import {
  readStayReviewQuestionsCache,
  writeStayReviewQuestionsCache,
} from "../lib/stayReviewCache";
import { readFacetElementCache, writeFacetElementCache } from "../lib/facetElementCache";
import { loadRoomElementPngDataUrl } from "../lib/elementPngMap";
import {
  fetchStayReviewCandidates,
  resolveHotelReviewPropertyId,
  type StayReviewGuestProfile,
} from "../lib/hotelReviewApi";
import { fetchGeneratedRoomElementImage } from "../lib/roomImageApi";
import { assignCandidatesToRoomItems } from "../lib/stayReviewQuestionAssignments";
import { readProfileRoomSticker, writeProfileRoomSticker } from "../lib/profileRoomSticker";
import roomFloorPlan from "../pic/room1.png";
import { ExpediaAppNav } from "./components/expedia/ExpediaAppNav";
import { MyTripsHomePage } from "./components/expedia/MyTripsHomePage";

// --- Types ---

interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  text: string;
  tags: string[];
  timestamp: string;
  roomId?: string;
}

interface CurrentUser {
  id: string;
  displayName: string;
  avatar: string;
  staySummary: string;
}

type DashboardView = "home" | "guest-reviews" | "reviewing";
type FloorPlanLoadState = "idle" | "loading" | "ok" | "error";

type GeneratedElementLayer = {
  roomItem: RoomItem;
  dataUrl: string;
  facetKey: string;
};

type DroppedElement = {
  roomItemId: string;
  dataUrl: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  scale: number;
};

type RateableArea = {
  id: string;
  roomItemId: string;
  /** Card headline: MISSING facets show `amenity · facet`; otherwise furniture label. */
  label: string;
  /** Original furniture label when `label` shows a facet (for a11y / context). */
  elementLabel?: string;
  description: string;
  priority: number;
  /** Backend facet (or FALLBACK:type) driving element icon generation. */
  facetKey?: string;
  amenity_id?: string;
  facet?: string;
};

// --- Mock Data ---

const REVIEWS: Review[] = [
  {
    id: "1",
    author: "Elena Rodriguez",
    avatar: "https://i.pravatar.cc/150?u=elena",
    rating: 5,
    text: "The room layout was incredibly intuitive. I loved the natural light in the morning. Everything was spotless and the bed was very comfortable.",
    tags: ["Clean", "Spacious", "Great Light"],
    timestamp: "2 hours ago",
    roomId: "living-area"
  },
  {
    id: "2",
    author: "Marcus Chen",
    avatar: "https://i.pravatar.cc/150?u=marcus",
    rating: 4,
    text: "Great location and very quiet. The workspace was perfect for my remote meetings. Minor issue with the shower pressure but fixed quickly.",
    tags: ["Workspace", "Quiet", "Fast Service"],
    timestamp: "5 hours ago",
    roomId: "workspace"
  },
  {
    id: "3",
    author: "Sarah Jenkins",
    avatar: "https://i.pravatar.cc/150?u=sarah",
    rating: 5,
    text: "Absolutely stunning view of the city. The balcony area is a highlight. We spent most of our evenings there watching the sunset.",
    tags: ["View", "Balcony", "Romantic"],
    timestamp: "Yesterday",
    roomId: "balcony"
  },
  {
    id: "4",
    author: "David Miller",
    avatar: "https://i.pravatar.cc/150?u=david",
    rating: 4,
    text: "The kitchen was well-equipped for basic cooking. Very modern appliances. The overall aesthetic of the room is very pleasing.",
    tags: ["Kitchen", "Modern", "Well-equipped"],
    timestamp: "2 days ago",
    roomId: "kitchen"
  }
];

const CURRENT_USER: CurrentUser = {
  id: "guest-402",
  displayName: "Elena Rodriguez",
  avatar: "https://i.pravatar.cc/150?u=elena",
  staySummary: "Deluxe Suite #402 · Apr 12–18"
};

const REVIEW_PRIORITY_BY_ITEM_TYPE: Record<string, number> = {
  bed: 5,
  sofa: 4,
  table: 3,
  sink: 2,
  fridge: 1,
};

const REVIEW_DESCRIPTION_BY_ITEM_TYPE: Record<string, string> = {
  bed: "Sleep quality, comfort, bedding cleanliness, and mattress support.",
  sofa: "Comfort level, upholstery condition, and usability for relaxing.",
  table: "Surface cleanliness, stability, and convenience for daily use.",
  sink: "Water flow, drainage, cleanliness, and overall maintenance.",
  fridge: "Cooling performance, hygiene, odor control, and accessibility.",
};

/** Base cards for Rate your stay; descriptions are replaced by backend follow-ups when available. */
const BASE_RATEABLE_AREAS: RateableArea[] = ROOM_GENERATION_MOCK.roomItems
  .map((roomItem) => ({
    id: roomItem.id,
    roomItemId: roomItem.id,
    label: roomItem.label,
    description:
      REVIEW_DESCRIPTION_BY_ITEM_TYPE[roomItem.type] ??
      "Evaluate condition, cleanliness, and overall practicality.",
    priority: REVIEW_PRIORITY_BY_ITEM_TYPE[roomItem.type] ?? 0,
  }))
  .sort((a, b) => b.priority - a.priority);

function mergeCachedStayAreas(cachedAreas: RateableArea[]): RateableArea[] {
  return BASE_RATEABLE_AREAS.map((base) => {
    const hit = cachedAreas.find((c) => c.id === base.id);
    if (!hit) return base;
    const roomItem = ROOM_GENERATION_MOCK.roomItems.find((r) => r.id === base.roomItemId)!;
    return {
      ...base,
      ...hit,
      facetKey: hit.facetKey ?? `FALLBACK:${roomItem.type}`,
      amenity_id: hit.amenity_id ?? "FALLBACK",
      facet: hit.facet ?? roomItem.type,
    };
  });
}

function areasWithFallbackFacets(): RateableArea[] {
  return BASE_RATEABLE_AREAS.map((a) => {
    const roomItem = ROOM_GENERATION_MOCK.roomItems.find((r) => r.id === a.roomItemId)!;
    return {
      ...a,
      facetKey: `FALLBACK:${roomItem.type}`,
      amenity_id: "FALLBACK",
      facet: roomItem.type,
    };
  });
}

const STAY_REVIEW_GUEST_PROFILE: StayReviewGuestProfile = {
  travelerType: "leisure",
  hasChildren: false,
  hasDietaryRestrictions: false,
  broughtCar: false,
  usedBreakfast: true,
  needsAirportShuttle: false,
  lateArrival: false,
  mobilityNeeds: false,
};

const USER_REVIEWS = REVIEWS.filter((review) => review.author === CURRENT_USER.displayName);

// --- Components ---

const clampPct = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const RoomOverview = ({
  activeRoom,
  highlightedElementId,
  showSummaryCards,
  floorPlanSrc,
  floorPlanLoadState,
  elementLayers,
  interactiveElementsEnabled,
  orderedReviewElements,
  unlockedElementCount,
  placedElements,
  onDropElement,
  onMovePlacedElement,
  onResizePlacedElement,
  roomCaptureRef,
  facetElementsLoadState,
}: {
  activeRoom: string | null;
  highlightedElementId: string | null;
  showSummaryCards: boolean;
  floorPlanSrc: string | null;
  floorPlanLoadState: FloorPlanLoadState;
  elementLayers: GeneratedElementLayer[];
  interactiveElementsEnabled: boolean;
  orderedReviewElements: GeneratedElementLayer[];
  unlockedElementCount: number;
  placedElements: DroppedElement[];
  onDropElement: (payload: { roomItemId: string; leftPct: number; topPct: number }) => void;
  onMovePlacedElement: (payload: { roomItemId: string; leftPct: number; topPct: number }) => void;
  onResizePlacedElement: (payload: { roomItemId: string; deltaScale: number }) => void;
  roomCaptureRef: RefObject<HTMLDivElement | null>;
  facetElementsLoadState: "idle" | "loading" | "ok" | "error";
}) => {
  const displaySrc = floorPlanSrc ?? roomFloorPlan;
  const showFloorLoading = floorPlanLoadState === "loading";
  const placedIdSet = new Set(placedElements.map((it) => it.roomItemId));
  const nextPlaceable = orderedReviewElements.find((it) => !placedIdSet.has(it.roomItem.id));
  const nextPlaceableIndex = nextPlaceable
    ? orderedReviewElements.findIndex((it) => it.roomItem.id === nextPlaceable.roomItem.id)
    : -1;
  const isNextUnlocked =
    nextPlaceableIndex >= 0 && nextPlaceableIndex < unlockedElementCount;
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    roomItemId: string;
    offsetXPct: number;
    offsetYPct: number;
  } | null>(null);

  const handleDragStart = (event: DragEvent, roomItemId: string, canDrag: boolean) => {
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/room-item-id", roomItemId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleRoomDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!interactiveElementsEnabled || !nextPlaceable || !isNextUnlocked) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleRoomDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!interactiveElementsEnabled || !nextPlaceable || !isNextUnlocked) return;
    event.preventDefault();
    const roomItemId = event.dataTransfer.getData("text/room-item-id");
    if (!roomItemId || roomItemId !== nextPlaceable.roomItem.id) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xPct = ((event.clientX - rect.left) / rect.width) * 100;
    const yPct = ((event.clientY - rect.top) / rect.height) * 100;
    const widthPct = (nextPlaceable.roomItem.width / ROOM_GENERATION_MOCK.roomStructure.width) * 100;
    const heightPct = (nextPlaceable.roomItem.height / ROOM_GENERATION_MOCK.roomStructure.height) * 100;

    const leftPct = clampPct(xPct - widthPct / 2, 0, 100 - widthPct);
    const topPct = clampPct(yPct - heightPct / 2, 0, 100 - heightPct);
    onDropElement({ roomItemId, leftPct, topPct });
  };

  const handlePlacedMouseDown = (event: ReactMouseEvent, item: DroppedElement) => {
    if (!interactiveElementsEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    const roomRect = roomCaptureRef.current?.getBoundingClientRect();
    if (!roomRect) return;
    const pointerXPct = ((event.clientX - roomRect.left) / roomRect.width) * 100;
    const pointerYPct = ((event.clientY - roomRect.top) / roomRect.height) * 100;
    setSelectedPlacedId(item.roomItemId);
    setDragState({
      roomItemId: item.roomItemId,
      offsetXPct: pointerXPct - item.leftPct,
      offsetYPct: pointerYPct - item.topPct,
    });
  };

  const handlePlacedWheel = (event: ReactWheelEvent, roomItemId: string) => {
    if (!interactiveElementsEnabled) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaScale = event.deltaY < 0 ? 0.05 : -0.05;
    onResizePlacedElement({ roomItemId, deltaScale });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event: MouseEvent) => {
      const roomRect = roomCaptureRef.current?.getBoundingClientRect();
      if (!roomRect) return;
      const current = placedElements.find((it) => it.roomItemId === dragState.roomItemId);
      if (!current) return;
      const pointerXPct = ((event.clientX - roomRect.left) / roomRect.width) * 100;
      const pointerYPct = ((event.clientY - roomRect.top) / roomRect.height) * 100;
      const scaledWidthPct = current.widthPct * current.scale;
      const scaledHeightPct = current.heightPct * current.scale;
      const leftPct = clampPct(pointerXPct - dragState.offsetXPct, 0, 100 - scaledWidthPct);
      const topPct = clampPct(pointerYPct - dragState.offsetYPct, 0, 100 - scaledHeightPct);
      onMovePlacedElement({ roomItemId: current.roomItemId, leftPct, topPct });
    };

    const handleUp = () => setDragState(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, onMovePlacedElement, placedElements, roomCaptureRef]);

  return (
    <div className="w-[48%] p-8 sticky top-20 h-[calc(100vh-80px)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Room Overview</h2>
          <p className="text-muted-foreground text-sm">Deluxe Suite #402 • Floor 4</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        {interactiveElementsEnabled && (
          <div className="w-32 shrink-0 rounded-2xl border border-white/60 bg-white/75 backdrop-blur-sm p-3 overflow-auto">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Elements
            </p>
            {facetElementsLoadState === "loading" && (
              <p className="text-[10px] text-muted-foreground mb-2">Generating facet icons…</p>
            )}
            {facetElementsLoadState === "error" && (
              <p className="text-[10px] text-amber-800/90 mb-2">Using local PNG fallbacks.</p>
            )}
            <div className="space-y-2">
              {orderedReviewElements.map((it, index) => {
                const isUnlocked = index < unlockedElementCount;
                const isPlaced = placedIdSet.has(it.roomItem.id);
                const canDrag =
                  facetElementsLoadState === "ok" &&
                  isUnlocked &&
                  !isPlaced &&
                  nextPlaceable?.roomItem.id === it.roomItem.id;
                return (
                  <button
                    key={it.facetKey}
                    type="button"
                    draggable={canDrag}
                    onDragStart={(event) => handleDragStart(event, it.roomItem.id, canDrag)}
                    className={cn(
                      "w-full rounded-xl border bg-white/90 p-2 text-left transition",
                      canDrag ? "cursor-grab border-primary/30 shadow-soft" : "cursor-not-allowed border-border/60",
                      isPlaced && "opacity-60"
                    )}
                  >
                    <img
                      src={it.dataUrl}
                      alt={it.roomItem.label}
                      className={cn("w-full h-12 object-contain", !isUnlocked && "grayscale opacity-40")}
                    />
                    <span className="mt-1 block text-[10px] leading-tight text-muted-foreground line-clamp-2">
                      {it.facetKey.includes("FALLBACK") ? it.roomItem.label : it.facetKey.split(":").pop()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 relative flex items-center justify-center min-h-0 [perspective:1400px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateX: 20, rotateY: -20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-md relative"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              ref={roomCaptureRef}
              className={cn(
                "relative w-full aspect-square rounded-[2rem] shadow-isometric soft-inner-shadow border-4 border-white/50 overflow-hidden bg-secondary",
                activeRoom != null && "ring-2 ring-primary/25 ring-offset-2 ring-offset-background"
              )}
              style={{ transform: "translateZ(0)" }}
              onDragOver={handleRoomDragOver}
              onDrop={handleRoomDrop}
              onMouseDown={() => setSelectedPlacedId(null)}
            >
              <img
                src={displaySrc}
                alt="Suite floor plan"
                className={cn(
                  "w-full h-auto object-contain block transition-opacity duration-500",
                  showFloorLoading && "opacity-40"
                )}
              />
              {!interactiveElementsEnabled && elementLayers.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {elementLayers.map(({ roomItem, dataUrl }) => (
                    <img
                      key={roomItem.id}
                      src={dataUrl}
                      alt={roomItem.label}
                      className={cn(
                        "absolute object-contain select-none transition-all duration-300",
                        highlightedElementId != null &&
                          roomItem.id !== highlightedElementId &&
                          "opacity-60 saturate-50",
                        roomItem.id === highlightedElementId &&
                          "scale-105 drop-shadow-[0_0_16px_rgba(250,204,21,0.95)]"
                      )}
                      style={{
                        left: `${(roomItem.x / ROOM_GENERATION_MOCK.roomStructure.width) * 100}%`,
                        top: `${(roomItem.y / ROOM_GENERATION_MOCK.roomStructure.height) * 100}%`,
                        width: `${(roomItem.width / ROOM_GENERATION_MOCK.roomStructure.width) * 100}%`,
                        height: `${(roomItem.height / ROOM_GENERATION_MOCK.roomStructure.height) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              )}
              {interactiveElementsEnabled && placedElements.length > 0 && (
                <div className="absolute inset-0 pointer-events-auto">
                  {placedElements.map((it) => (
                    <div
                      key={it.roomItemId}
                      className={cn(
                        "absolute transition-all duration-300 pointer-events-auto",
                        highlightedElementId != null &&
                          it.roomItemId !== highlightedElementId &&
                          "opacity-60 saturate-50",
                        it.roomItemId === highlightedElementId &&
                          "scale-105 drop-shadow-[0_0_16px_rgba(250,204,21,0.95)]"
                      )}
                      style={{
                        left: `${it.leftPct}%`,
                        top: `${it.topPct}%`,
                        width: `${it.widthPct * it.scale}%`,
                        height: `${it.heightPct * it.scale}%`,
                      }}
                      onMouseDown={(event) => handlePlacedMouseDown(event, it)}
                      onWheel={(event) => handlePlacedWheel(event, it.roomItemId)}
                    >
                      <img
                        src={it.dataUrl}
                        alt={it.roomItemId}
                        draggable={false}
                        className={cn(
                          "w-full h-full object-contain select-none cursor-move",
                          selectedPlacedId === it.roomItemId && "drop-shadow-[0_0_14px_rgba(15,23,42,0.25)]"
                        )}
                      />
                      {selectedPlacedId === it.roomItemId && (
                        <div className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full border bg-white/95 shadow-soft p-1">
                          <button
                            type="button"
                            className="w-5 h-5 text-xs rounded-full border border-border/70 hover:bg-secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onResizePlacedElement({ roomItemId: it.roomItemId, deltaScale: -0.08 });
                            }}
                            aria-label="Shrink element"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            className="w-5 h-5 text-xs rounded-full border border-border/70 hover:bg-secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onResizePlacedElement({ roomItemId: it.roomItemId, deltaScale: 0.08 });
                            }}
                            aria-label="Enlarge element"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* {interactiveElementsEnabled && nextPlaceable && isNextUnlocked && (
                <p className="absolute top-2 left-2 right-2 text-center text-[10px] text-foreground/80 bg-white/80 rounded-lg py-1 px-2">
                  Drag {nextPlaceable.roomItem.label} into the room to continue.
                </p>
              )} */}
              {interactiveElementsEnabled && nextPlaceable && !isNextUnlocked && (
                <p className="absolute top-2 left-2 right-2 text-center text-[10px] text-foreground/80 bg-white/80 rounded-lg py-1 px-2">
                  Rate one card to unlock the next element.
                </p>
              )}
              {showFloorLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                  <p className="text-sm font-medium text-foreground/90 px-4 py-2 rounded-full bg-white/80 shadow-soft">
                    Loading floor plan…
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {showSummaryCards && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-soft border border-white/50">
            <Users className="w-5 h-5 mb-2 text-muted-foreground" />
            <span className="block text-sm font-bold">2 Guests</span>
            <span className="text-[10px] text-muted-foreground">Maximum Capacity</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-soft border border-white/50">
            <Calendar className="w-5 h-5 mb-2 text-muted-foreground" />
            <span className="block text-sm font-bold">Check-in</span>
            <span className="text-[10px] text-muted-foreground">14:00 PM</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-soft border border-white/50">
            <CheckCircle2 className="w-5 h-5 mb-2 text-muted-foreground" />
            <span className="block text-sm font-bold">Verified</span>
            <span className="text-[10px] text-muted-foreground">Quality Check</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ================================================== REVIEWS SECTION ================================================== //

const ReviewSection = ({
  onHoverReview,
  currentUser
}: {
  onHoverReview: (id: string | null) => void;
  currentUser: CurrentUser;
}) => {
  return (
    <div className="w-[52%] p-8 bg-white/30 border-l border-white/50">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{currentUser.displayName}'s Reviews</h2>
          <Badge variant="outline" className="rounded-full bg-white/50 border-white/50 text-muted-foreground">
            {USER_REVIEWS.length} Total
          </Badge>
        </div>
        <Button className="rounded-full gap-2 shadow-soft hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" /> Add Review
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)] pr-4">
        <div className="space-y-6">
          {USER_REVIEWS.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => onHoverReview(review.roomId || null)}
              onMouseLeave={() => onHoverReview(null)}
            >
              <Card className="group border-none shadow-soft hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                        <AvatarImage src={review.avatar} />
                        <AvatarFallback>{review.author[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-lg leading-tight">{review.author}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "w-3 h-3", 
                                i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
                              )} 
                            />
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-2 uppercase tracking-widest font-medium">
                            {review.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </div>

                  <p className="text-muted-foreground leading-relaxed mb-6">
                    "{review.text}"
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {review.tags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="rounded-full px-3 py-1 font-normal text-xs bg-secondary/50 text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {review.roomId && (
                      <Badge 
                        variant="outline" 
                        className="rounded-full px-3 py-1 font-medium text-xs border-primary/10 text-primary flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" /> {review.roomId.replace('-', ' ')}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// ================================================== REVIEWING SECTION ================================================== //

const ReviewingSection = ({
  areas,
  stayQuestionsLoadState,
  onHoverArea,
  highlightedElementId,
  onRatedCountChange,
  onSubmitRatings,
  submitInFlight,
}: {
  areas: RateableArea[];
  stayQuestionsLoadState: "idle" | "loading" | "ok" | "error";
  onHoverArea: (id: string | null) => void;
  highlightedElementId: string | null;
  onRatedCountChange: (value: number) => void;
  onSubmitRatings: () => Promise<boolean>;
  submitInFlight: boolean;
}) => {
  const [ratings, setRatings] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(areas.map((a) => [a.id, null]))
  );
  const [submitted, setSubmitted] = useState(false);

  const ratedCount = areas.filter((a) => ratings[a.id] != null).length;
  const allRated = ratedCount === areas.length;
  const shouldShowCards =
    stayQuestionsLoadState === "ok" || stayQuestionsLoadState === "error";

  useEffect(() => {
    onRatedCountChange(ratedCount);
  }, [onRatedCountChange, ratedCount]);

  const setRating = (areaId: string, value: number) => {
    setSubmitted(false);
    setRatings((prev) => ({ ...prev, [areaId]: value }));
  };

  const handleSubmit = async () => {
    if (!allRated) return;
    const ok = await onSubmitRatings();
    if (ok) setSubmitted(true);
  };

  return (
    <div className="w-[52%] p-8 bg-white/30 border-l border-white/50">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Rate your stay</h2>
          <Badge variant="outline" className="rounded-full bg-white/50 border-white/50 text-muted-foreground">
            {ratedCount} / {areas.length} areas
          </Badge>
          {stayQuestionsLoadState === "loading" && (
            <span className="text-xs text-muted-foreground">Loading suggested questions…</span>
          )}
          {stayQuestionsLoadState === "error" && (
            <span className="text-xs text-amber-700/90">Using default prompts (hotel-review data unavailable).</span>
          )}
        </div>
        <Button
          className="rounded-full gap-2 shadow-soft hover:shadow-lg transition-all"
          disabled={!allRated || submitted || submitInFlight}
          onClick={handleSubmit}
        >
          <ClipboardCheck className="w-4 h-4" />{" "}
          {submitInFlight ? "Saving snapshot..." : submitted ? "Submitted" : "Submit my ratings"}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)] pr-4">
        <div className="space-y-6">

          {submitted && (
            <p className="text-sm text-primary font-medium px-1">
              Thank you — your scores for this stay have been recorded.
            </p>
          )}

          {shouldShowCards && (
            <div className="grid grid-cols-1 gap-4">
              {areas.map((area, index) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                onMouseEnter={() => onHoverArea(area.roomItemId)}
                onMouseLeave={() => onHoverArea(null)}
              >
                <Card
                  className={cn(
                    "border-none shadow-soft rounded-3xl bg-white/80 backdrop-blur-sm transition-all h-full",
                    highlightedElementId === area.roomItemId
                      ? "shadow-[0_0_0_2px_rgba(250,204,21,0.35),0_16px_30px_-14px_rgba(234,179,8,0.65)]"
                      : "hover:shadow-lg"
                  )}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h5 className="font-semibold">{area.label}</h5>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="rounded-full text-[10px]">
                          Priority #{index + 1}
                        </Badge>
                        {ratings[area.id] != null ? (
                          <Badge variant="secondary" className="rounded-full">
                            {ratings[area.id]} / 5
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            Tap to rate
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5 flex-1">{area.description}</p>
                    <div
                      className="flex items-center gap-1"
                      role="group"
                      aria-label={`Rate ${area.elementLabel ?? area.label}`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(area.id, star)}
                          className={cn(
                            "p-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            "hover:bg-secondary/80"
                          )}
                          aria-label={`${star} stars for ${area.elementLabel ?? area.label}`}
                        >
                          <Star
                            className={cn(
                              "w-7 h-7",
                              ratings[area.id] != null && star <= (ratings[area.id] as number)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/35"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default function App() {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("home");
  const [floorPlanSrc, setFloorPlanSrc] = useState<string | null>(null);
  const [elementLayers, setElementLayers] = useState<GeneratedElementLayer[]>([]);
  const [floorPlanLoadState, setFloorPlanLoadState] = useState<FloorPlanLoadState>("idle");
  const [reviewingAreas, setReviewingAreas] = useState<RateableArea[]>(() => areasWithFallbackFacets());
  const [stayQuestionsLoadState, setStayQuestionsLoadState] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [facetElementsLoadState, setFacetElementsLoadState] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [ratedCountForUnlock, setRatedCountForUnlock] = useState(0);
  const [placedElements, setPlacedElements] = useState<DroppedElement[]>([]);
  const [submitInFlight, setSubmitInFlight] = useState(false);
  const [profileStickerUrl, setProfileStickerUrl] = useState<string | null>(() =>
    typeof window !== "undefined" ? readProfileRoomSticker() : null
  );
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const roomCaptureRef = useRef<HTMLDivElement | null>(null);

  const orderedReviewElements = reviewingAreas
    .map((area) => elementLayers.find((it) => it.roomItem.id === area.roomItemId))
    .filter((it): it is GeneratedElementLayer => Boolean(it));
  const unlockedElementCount = Math.min(ratedCountForUnlock + 1, orderedReviewElements.length);

  const facetGenSignature = useMemo(
    () => reviewingAreas.map((a) => `${a.roomItemId}:${a.facetKey ?? ""}`).join("|"),
    [reviewingAreas]
  );

  useEffect(() => {
    if (view !== "reviewing") {
      setStayQuestionsLoadState("idle");
      setPlacedElements([]);
      setRatedCountForUnlock(0);
      return;
    }

    // After the first successful fetch we persist to sessionStorage; later visits reuse
    // questions + facet images (see facet effect + readFacetElementCache) without regenerating.
    const cached = readStayReviewQuestionsCache();
    if (cached?.areas?.length) {
      setReviewingAreas(mergeCachedStayAreas(cached.areas as RateableArea[]));
      setStayQuestionsLoadState("ok");
      return;
    }

    let cancelled = false;
    setStayQuestionsLoadState("loading");

    (async () => {
      try {
        const propertyId = await resolveHotelReviewPropertyId();
        if (cancelled) return;
        if (!propertyId) {
          setReviewingAreas(areasWithFallbackFacets());
          setStayQuestionsLoadState("error");
          return;
        }
        const candidates = await fetchStayReviewCandidates(propertyId, {
          limit: 16,
          useAi: true,
          guestProfile: STAY_REVIEW_GUEST_PROFILE,
          draftText: "",
          askedFacets: [],
        });
        if (cancelled) return;
        const orderedItems = BASE_RATEABLE_AREAS.map(
          (a) => ROOM_GENERATION_MOCK.roomItems.find((r) => r.id === a.roomItemId)!
        );
        const missingCandidates = candidates.filter(
          (c) => String(c.state ?? "").toUpperCase() === "MISSING"
        );
        const poolForAssign = missingCandidates.length > 0 ? missingCandidates : candidates;
        const assigned = assignCandidatesToRoomItems(orderedItems, poolForAssign);
        const merged: RateableArea[] = BASE_RATEABLE_AREAS.map((a) => {
          const q = assigned.get(a.roomItemId);
          const roomItem = ROOM_GENERATION_MOCK.roomItems.find((r) => r.id === a.roomItemId)!;
          if (!q) {
            return {
              ...a,
              facetKey: `FALLBACK:${roomItem.type}`,
              amenity_id: "FALLBACK",
              facet: roomItem.type,
            };
          }
          const isMissing = String(q.state ?? "").toUpperCase() === "MISSING";
          return {
            ...a,
            description: q.questionText,
            amenity_id: q.amenity_id,
            facet: q.facet,
            facetKey: `${q.amenity_id}:${q.facet}`,
            ...(isMissing
              ? { elementLabel: a.label, label: `${q.amenity_id} · ${q.facet}` }
              : {}),
          };
        });
        setReviewingAreas(merged);
        writeStayReviewQuestionsCache({ areas: merged });
        setStayQuestionsLoadState("ok");
      } catch {
        if (!cancelled) {
          setReviewingAreas(areasWithFallbackFacets());
          setStayQuestionsLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (view === "home") {
      setFloorPlanSrc(null);
      setElementLayers([]);
      setFloorPlanLoadState("idle");
      setHighlightedElementId(null);
      setPlacedElements([]);
      setRatedCountForUnlock(0);
      setFacetElementsLoadState("idle");
      return;
    }

    setFloorPlanSrc(roomFloorPlan);
    setFloorPlanLoadState("ok");
    if (view === "guest-reviews") {
      setElementLayers([]);
      setFacetElementsLoadState("idle");
    }
    if (view === "reviewing") {
      setElementLayers([]);
    }
  }, [view]);

  useEffect(() => {
    if (view !== "reviewing") {
      return;
    }
    if (stayQuestionsLoadState !== "ok" && stayQuestionsLoadState !== "error") {
      return;
    }

    const tasks = reviewingAreas.map((area) => {
      const roomItem = ROOM_GENERATION_MOCK.roomItems.find((r) => r.id === area.roomItemId)!;
      const facetKey = area.facetKey ?? `FALLBACK:${roomItem.type}`;
      return { area, roomItem, facetKey };
    });

    const cache = readFacetElementCache();
    const cacheOk =
      cache &&
      cache.items.length === tasks.length &&
      tasks.every(
        (t, i) =>
          cache.items[i]?.facetKey === t.facetKey && cache.items[i]?.roomItemId === t.roomItem.id
      );

    if (cacheOk && cache) {
      const layers: GeneratedElementLayer[] = tasks.map((t, i) => ({
        roomItem: t.roomItem,
        dataUrl: cache.items[i].dataUrl,
        facetKey: t.facetKey,
      }));
      setElementLayers(layers);
      setFacetElementsLoadState("ok");
      return;
    }

    let cancelled = false;
    setFacetElementsLoadState("loading");

    (async () => {
      try {
        const results = await Promise.all(
          tasks.map(async (t) => {
            try {
              const res = await fetchGeneratedRoomElementImage({
                roomItem: t.roomItem,
                facetKey: t.facetKey,
              });
              return {
                roomItem: t.roomItem,
                dataUrl: `data:${res.mimeType};base64,${res.imageBase64}`,
                facetKey: t.facetKey,
              };
            } catch {
              const dataUrl = await loadRoomElementPngDataUrl(t.roomItem.type);
              return { roomItem: t.roomItem, dataUrl, facetKey: t.facetKey };
            }
          })
        );
        if (cancelled) return;
        setElementLayers(results);
        writeFacetElementCache({
          items: results.map((r) => ({
            facetKey: r.facetKey,
            roomItemId: r.roomItem.id,
            dataUrl: r.dataUrl,
          })),
        });
        setFacetElementsLoadState("ok");
      } catch {
        if (!cancelled) {
          setFacetElementsLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view, stayQuestionsLoadState, facetGenSignature]);

  const handleDropElementToRoom = (payload: {
    roomItemId: string;
    leftPct: number;
    topPct: number;
  }) => {
    setPlacedElements((prev) => {
      if (prev.some((it) => it.roomItemId === payload.roomItemId)) return prev;
      const allowedCount = Math.min(ratedCountForUnlock + 1, orderedReviewElements.length);
      if (prev.length >= allowedCount) return prev;
      const nextLayer = orderedReviewElements[prev.length];
      if (!nextLayer || nextLayer.roomItem.id !== payload.roomItemId) return prev;
      const widthPct = (nextLayer.roomItem.width / ROOM_GENERATION_MOCK.roomStructure.width) * 100;
      const heightPct = (nextLayer.roomItem.height / ROOM_GENERATION_MOCK.roomStructure.height) * 100;
      return [
        ...prev,
        {
          roomItemId: payload.roomItemId,
          dataUrl: nextLayer.dataUrl,
          leftPct: payload.leftPct,
          topPct: payload.topPct,
          widthPct,
          heightPct,
          scale: 1,
        },
      ];
    });
  };

  const handleMovePlacedElement = (payload: {
    roomItemId: string;
    leftPct: number;
    topPct: number;
  }) => {
    setPlacedElements((prev) =>
      prev.map((it) =>
        it.roomItemId === payload.roomItemId
          ? { ...it, leftPct: payload.leftPct, topPct: payload.topPct }
          : it
      )
    );
  };

  const handleResizePlacedElement = (payload: { roomItemId: string; deltaScale: number }) => {
    setPlacedElements((prev) =>
      prev.map((it) => {
        if (it.roomItemId !== payload.roomItemId) return it;
        const nextScale = clampPct(it.scale + payload.deltaScale, 0.6, 1.8);
        const scaledWidthPct = it.widthPct * nextScale;
        const scaledHeightPct = it.heightPct * nextScale;
        return {
          ...it,
          scale: nextScale,
          leftPct: clampPct(it.leftPct, 0, 100 - scaledWidthPct),
          topPct: clampPct(it.topPct, 0, 100 - scaledHeightPct),
        };
      })
    );
  };

  const handleSubmitRatings = async (): Promise<boolean> => {
    const roomNode = roomCaptureRef.current;
    if (!roomNode) return false;

    setSubmitInFlight(true);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const captureOpts = {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      } as const;
      let dataUrl: string;
      try {
        dataUrl = await toJpeg(roomNode, { ...captureOpts, quality: 0.88 });
      } catch {
        dataUrl = await toPng(roomNode, captureOpts);
      }
      if (!dataUrl || dataUrl.length < 32) return false;
      writeProfileRoomSticker(dataUrl);
      setProfileStickerUrl(dataUrl);
      return true;
    } catch {
      return false;
    } finally {
      setSubmitInFlight(false);
    }
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-primary-foreground">
      {view === "home" ? (
        <MyTripsHomePage
          currentUser={CURRENT_USER}
          onOpenGuestReviews={() => setView("guest-reviews")}
          onOpenReviewing={() => setView("reviewing")}
          onOpenProfile={() => setProfileModalOpen(true)}
          hasRoomSticker={Boolean(profileStickerUrl)}
        />
      ) : (
        <div className="min-h-screen bg-brand-bg text-brand-dark selection:bg-brand-dark selection:text-white">
          <ExpediaAppNav
            activeView={view}
            currentUser={CURRENT_USER}
            onHome={() => setView("home")}
            onGuestReviews={() => setView("guest-reviews")}
            onReviewing={() => setView("reviewing")}
            onOpenProfile={() => setProfileModalOpen(true)}
            hasRoomSticker={Boolean(profileStickerUrl)}
          />

          <main className="flex">
            <RoomOverview
              activeRoom={activeRoom}
              highlightedElementId={highlightedElementId}
              showSummaryCards={view === "guest-reviews"}
              floorPlanSrc={floorPlanSrc}
              floorPlanLoadState={floorPlanLoadState}
              elementLayers={view === "reviewing" ? elementLayers : []}
              interactiveElementsEnabled={view === "reviewing"}
              orderedReviewElements={orderedReviewElements}
              unlockedElementCount={unlockedElementCount}
              placedElements={placedElements}
              onDropElement={handleDropElementToRoom}
              onMovePlacedElement={handleMovePlacedElement}
              onResizePlacedElement={handleResizePlacedElement}
              roomCaptureRef={roomCaptureRef}
              facetElementsLoadState={facetElementsLoadState}
            />
            {view === "guest-reviews" ? (
              <ReviewSection currentUser={CURRENT_USER} onHoverReview={setActiveRoom} />
            ) : (
              <ReviewingSection
                areas={reviewingAreas}
                stayQuestionsLoadState={stayQuestionsLoadState}
                highlightedElementId={highlightedElementId}
                onRatedCountChange={setRatedCountForUnlock}
                onSubmitRatings={handleSubmitRatings}
                submitInFlight={submitInFlight}
                onHoverArea={(id) => {
                  setHighlightedElementId(id);
                  setActiveRoom(id);
                }}
              />
            )}
          </main>
        </div>
      )}

      {profileModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-room-sticker-title"
          onClick={() => setProfileModalOpen(false)}
        >
          <Card
            className="max-w-lg w-full max-h-[90vh] overflow-hidden border-none shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60">
                <h2 id="profile-room-sticker-title" className="text-sm font-semibold">
                  Your room layout
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  onClick={() => setProfileModalOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 bg-secondary/40">
                {profileStickerUrl ? (
                  <img
                    src={profileStickerUrl}
                    alt="Saved room layout from your last submission"
                    className="w-full h-auto rounded-xl border border-white/80 shadow-soft object-contain max-h-[min(70vh,520px)] mx-auto bg-white"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10 px-2">
                    Complete <strong>Rate your stay</strong> and submit — your room snapshot will be saved here.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
