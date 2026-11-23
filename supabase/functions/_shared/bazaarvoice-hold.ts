// Intentionally fail closed: restoring credentials alone must not resume API use.
export function bazaarvoiceHoldResponse(headers: Record<string, string>): Response | null {
  return new Response(JSON.stringify({
    success: false,
    paused: true,
    code: "BAZAARVOICE_ON_HOLD",
    collected: 0,
    message: "바자보이스 API 연동이 해제되어 수집이 중지되었습니다.",
  }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
}