import bedUrl from "../pic/bed.png";
import recTableUrl from "../pic/rec_table.png";
import roundTableUrl from "../pic/round_table.png";
import sofaUrl from "../pic/sofa.png";
import windowUrl from "../pic/window.png";

/**
 * Maps `RoomItem.type` to bundled PNGs under `/pic`.
 * Types without a dedicated asset reuse the closest shape as a stand-in until more PNGs are added.
 */
const ROOM_ITEM_TYPE_TO_PNG: Record<string, string> = {
  bed: bedUrl,
  sofa: sofaUrl,
  table: recTableUrl,
  fridge: roundTableUrl,
  sink: windowUrl,
};

export async function loadRoomElementPngDataUrl(roomItemType: string): Promise<string> {
  const assetUrl = ROOM_ITEM_TYPE_TO_PNG[roomItemType];
  if (!assetUrl) {
    throw new Error(`No PNG mapped for room item type: ${roomItemType}`);
  }
  const res = await fetch(assetUrl);
  if (!res.ok) {
    throw new Error(`Failed to load element PNG for type "${roomItemType}"`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}
