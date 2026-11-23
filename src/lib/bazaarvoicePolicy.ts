export function isBazaarvoiceCollectionHeld(channelId: string): boolean {
  return channelId.startsWith("bv_");
}