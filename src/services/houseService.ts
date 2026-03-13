// ============================================================
// houseService.ts — All Supabase DB operations for HouseHub
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { genCode, Member, CleanRecord, Purchase, SupplyResponsibility } from "@/lib/househub";

export const houseService = {

  // ----------------------------------------------------------
  // HOUSE
  // ----------------------------------------------------------

  /** Generates a unique 6-digit house code. */
  async generateUniqueHouseCode(): Promise<string> {
    let code = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = genCode();
      const { data, error } = await supabase
        .from("houses")
        .select("house_code")
        .eq("house_code", code)
        .maybeSingle();

      if (error) throw new Error("Failed to verify house code uniqueness");
      if (!data) isUnique = true;
      attempts++;
    }

    if (!isUnique) throw new Error("Could not generate unique house code");
    return code;
  },

  /** Creates a new house row. Returns the full inserted row. */
  async createHouse(name: string, code: string) {
    const { data, error } = await supabase
      .from("houses")
      .insert({ name: name.trim(), house_code: code })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Finds a house by its 6-digit code. Returns null if not found. */
  async getHouseByCode(code: string) {
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("house_code", code)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // ----------------------------------------------------------
  // MEMBERS
  // ----------------------------------------------------------

  /** Inserts all members for a house. Returns inserted rows with real UUIDs. */
  async insertMembers(
    houseId: string,
    names: string[]
  ): Promise<Member[]> {
    const rows = names.map((name) => ({
      house_id: houseId,
      name: name.trim(),
    }));

    const { data, error } = await supabase
      .from("members")
      .insert(rows)
      .select();

    if (error) throw error;
    return data as Member[];
  },

  /** Fetches all members for a house. */
  async getMembers(houseId: string): Promise<Member[]> {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("house_id", houseId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as Member[];
  },

  // ----------------------------------------------------------
  // CLEAN RECORDS
  // ----------------------------------------------------------

  /** Inserts a single cleaning record. */
  async insertCleanRecord(
    houseId: string,
    memberId: string,
    date: string
  ): Promise<void> {
    const { error } = await supabase
      .from("clean_records")
      .insert({ house_id: houseId, member_id: memberId, date });

    if (error) throw error;
  },

  /** Fetches all cleaning records for a house, newest first. */
  async getCleanRecords(houseId: string): Promise<CleanRecord[]> {
    const { data, error } = await supabase
      .from("clean_records")
      .select("*")
      .eq("house_id", houseId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data as CleanRecord[];
  },

  // ----------------------------------------------------------
  // PURCHASES
  // ----------------------------------------------------------

  /** Inserts a single purchase record. */
  async insertPurchase(
    houseId: string,
    memberId: string,
    itemName: string,
    date: string
  ): Promise<void> {
    const { error } = await supabase
      .from("purchases")
      .insert({ house_id: houseId, member_id: memberId, item_name: itemName, date });

    if (error) throw error;
  },

  /** Fetches all purchases for a house, newest first. */
  async getPurchases(houseId: string): Promise<Purchase[]> {
    const { data, error } = await supabase
      .from("purchases")
      .select("*")
      .eq("house_id", houseId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data as Purchase[];
  },

  // ----------------------------------------------------------
  // SUPPLY RESPONSIBILITIES
  // ----------------------------------------------------------

  /**
   * Inserts the initial supply responsibility rows (one per item).
   * Called once during setup wizard.
   */
  async insertSupplyResponsibilities(
    houseId: string,
    items: { item_name: string; next_member_id: string }[]
  ): Promise<void> {
    const rows = items.map((i) => ({
      house_id: houseId,
      item_name: i.item_name,
      next_member_id: i.next_member_id,
    }));

    const { error } = await supabase
      .from("supply_responsibilities")
      .insert(rows);

    if (error) throw error;
  },

  /** Fetches all supply responsibilities for a house. */
  async getSupplyResponsibilities(
    houseId: string
  ): Promise<SupplyResponsibility[]> {
    const { data, error } = await supabase
      .from("supply_responsibilities")
      .select("*")
      .eq("house_id", houseId);

    if (error) throw error;
    return data as SupplyResponsibility[];
  },

  /**
   * Updates who is next to buy a specific supply item.
   * Called after someone logs a purchase.
   */
  async updateNextBuyer(
    houseId: string,
    itemName: string,
    nextMemberId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("supply_responsibilities")
      .update({ next_member_id: nextMemberId })
      .eq("house_id", houseId)
      .eq("item_name", itemName);

    if (error) throw error;
  },
};
