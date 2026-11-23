export function isBazaarvoiceCollectionHeld(channelId: string): boolean {
  return channelId.startsWith("bv_") || channelId === "lge_com_direct";
}