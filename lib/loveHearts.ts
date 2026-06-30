export type LoveHeartSourceType = "qt_reaction" | "prayer_intercession" | "answered_prayer_gratitude";

export type LoveHeartAwardResult = {
  awarded: boolean;
  balance: number;
  amount: number;
};

function normalizeAwardResult(data: unknown): LoveHeartAwardResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  return {
    awarded: Boolean(value.awarded),
    balance: Number(value.balance ?? 0),
    amount: Number(value.amount ?? 0),
  };
}

export async function awardLoveHeartOnce(
  supabase: any,
  sourceType: LoveHeartSourceType,
  sourceId: string,
): Promise<LoveHeartAwardResult | null> {
  const { data, error } = await supabase.rpc("award_love_heart_once", {
    p_source_type: sourceType,
    p_source_id: sourceId,
  });

  if (error) throw error;
  return normalizeAwardResult(data);
}

export async function getLoveHeartBalance(supabase: any, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("love_heart_wallets")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.balance ?? 0);
}
