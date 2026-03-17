// ============================================================
// houseService.ts — All Firebase DB operations for HouseHub
// ============================================================

import { db } from "@/lib/firebase";
import { 
  ref, 
  set, 
  get, 
  push, 
  query, 
  orderByChild, 
  equalTo, 
  update,
  remove,
} from "firebase/database";
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
      const housesRef = ref(db, "houses");
      const codeQuery = query(housesRef, orderByChild("house_code"), equalTo(code));
      const snapshot = await get(codeQuery);

      if (!snapshot.exists()) isUnique = true;
      attempts++;
    }

    if (!isUnique) throw new Error("Could not generate unique house code");
    return code;
  },

  /** Creates a new house row. Returns the full inserted row. */
  async createHouse(name: string, code: string) {
    const housesRef = ref(db, "houses");
    const newHouseRef = push(housesRef);
    const houseData = {
      id: newHouseRef.key,
      name: name.trim(),
      house_code: code,
      created_at: new Date().toISOString()
    };
    await set(newHouseRef, houseData);
    return houseData;
  },

  /** Finds a house by its 6-digit code. Returns null if not found. */
  async getHouseByCode(code: string) {
    const housesRef = ref(db, "houses");
    const codeQuery = query(housesRef, orderByChild("house_code"), equalTo(code));
    const snapshot = await get(codeQuery);
    
    if (!snapshot.exists()) return null;
    
    // Firebase query returns a Map; since house_code is unique, we take the first.
    const data = snapshot.val();
    const firstKey = Object.keys(data)[0];
    return data[firstKey];
  },

  // ----------------------------------------------------------
  // MEMBERS
  // ----------------------------------------------------------

  /** Inserts all members for a house. Returns inserted rows with real UUIDs. */
  async insertMembers(
    houseId: string,
    names: string[]
  ): Promise<Member[]> {
    const results: Member[] = [];
    const membersRef = ref(db, `members/${houseId}`);

    for (const name of names) {
      const newMemberRef = push(membersRef);
      const memberData = {
        id: newMemberRef.key!,
        house_id: houseId,
        name: name.trim(),
        created_at: new Date().toISOString()
      };
      await set(newMemberRef, memberData);
      results.push(memberData as Member);
    }

    return results;
  },

  /** Fetches all members for a house. */
  async getMembers(houseId: string): Promise<Member[]> {
    const membersRef = ref(db, `members/${houseId}`);
    const snapshot = await get(membersRef);
    
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    return Object.values(data) as Member[];
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
    const recsRef = ref(db, `clean_records/${houseId}`);
    const newRecRef = push(recsRef);
    await set(newRecRef, {
      id: newRecRef.key,
      house_id: houseId,
      member_id: memberId,
      date,
      created_at: new Date().toISOString()
    });
  },

  /** Fetches all cleaning records for a house, newest first. */
  async getCleanRecords(houseId: string): Promise<CleanRecord[]> {
    const recsRef = ref(db, `clean_records/${houseId}`);
    const snapshot = await get(recsRef);
    
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    const recs = Object.values(data) as CleanRecord[];
    // Sort descending by date
    return recs.sort((a, b) => b.date.localeCompare(a.date));
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
    const purchasesRef = ref(db, `purchases/${houseId}`);
    const newPurchaseRef = push(purchasesRef);
    await set(newPurchaseRef, {
      id: newPurchaseRef.key,
      house_id: houseId,
      member_id: memberId,
      item_name: itemName,
      date,
      created_at: new Date().toISOString()
    });
  },

  /** Fetches all purchases for a house, newest first. */
  async getPurchases(houseId: string): Promise<Purchase[]> {
    const purchasesRef = ref(db, `purchases/${houseId}`);
    const snapshot = await get(purchasesRef);
    
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    const purchases = Object.values(data) as Purchase[];
    // Sort descending by date
    return purchases.sort((a, b) => b.date.localeCompare(a.date));
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
    const respsRef = ref(db, `supply_responsibilities/${houseId}`);
    
    const updates: Record<string, any> = {};
    items.forEach(item => {
      const newKey = push(respsRef).key;
      updates[newKey!] = {
        id: newKey,
        house_id: houseId,
        item_name: item.item_name,
        next_member_id: item.next_member_id
      };
    });

    await update(respsRef, updates);
  },

  /** Fetches all supply responsibilities for a house. */
  async getSupplyResponsibilities(
    houseId: string
  ): Promise<SupplyResponsibility[]> {
    const respsRef = ref(db, `supply_responsibilities/${houseId}`);
    const snapshot = await get(respsRef);
    
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    return Object.values(data) as SupplyResponsibility[];
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
    const respsRef = ref(db, `supply_responsibilities/${houseId}`);
    const snapshot = await get(respsRef);
    
    if (!snapshot.exists()) return;

    const data = snapshot.val();
    const itemKey = Object.keys(data).find(key => data[key].item_name === itemName);
    
    if (itemKey) {
      const itemRef = ref(db, `supply_responsibilities/${houseId}/${itemKey}`);
      await update(itemRef, { next_member_id: nextMemberId });
    }
  },

  // ----------------------------------------------------------
  // HOUSE SETTINGS
  // ----------------------------------------------------------

  /** Saves (upserts) house settings. Called once at end of setup wizard. */
  async saveHouseSettings(
    houseId: string,
    settings: {
      supplies:                { id: string; label: string; icon: string; col: string; bg: string }[];
      cleaning_enabled:        boolean;
      cleaning_frequency:      string;
      cleaning_day:            number;
      rotation_type:           string;
      cleaning_rotation_order?: string[];
      supplies_rotation_order?: string[];
      excluded_members?:        Record<string, string[]>;
    }
  ): Promise<void> {
    const settingsRef = ref(db, `house_settings/${houseId}`);
    await set(settingsRef, {
      house_id:                houseId,
      supplies:                settings.supplies,
      cleaning_enabled:        settings.cleaning_enabled,
      cleaning_frequency:      settings.cleaning_frequency,
      cleaning_day:            settings.cleaning_day,
      rotation_type:           settings.rotation_type,
      cleaning_rotation_order: settings.cleaning_rotation_order ?? [],
      supplies_rotation_order: settings.supplies_rotation_order ?? [],
      excluded_members:        settings.excluded_members ?? {},
    });
  },

  /** Updates excluded members for a specific key (cleaning or item name). */
  async updateExcludedMembers(
    houseId:  string,
    key:      string, // "cleaning" or supply item name like "Gas"
    memberIds: string[]
  ): Promise<void> {
    const settings = await this.getHouseSettings(houseId);
    if (!settings) return;
    const updated = {
      ...settings,
      excluded_members: {
        ...(settings.excluded_members || {}),
        [key]: memberIds,
      }
    };
    await this.saveHouseSettings(houseId, updated);
  },

  /** Fetches house settings. Returns null if not set up yet (legacy houses). */
  async getHouseSettings(houseId: string) {
    const settingsRef = ref(db, `house_settings/${houseId}`);
    const snapshot = await get(settingsRef);
    
    if (!snapshot.exists()) return null;
    return snapshot.val();
  },

  /** Adds a new supply item to the house settings supplies array. */
  async addSupplyItem(
    houseId: string,
    currentSupplies: { id: string; label: string; icon: string; col: string; bg: string }[],
    newItem:         { id: string; label: string; icon: string; col: string; bg: string }
  ): Promise<void> {
    const updated = [...currentSupplies, newItem];
    const settingsRef = ref(db, `house_settings/${houseId}`);
    await update(settingsRef, { supplies: updated });
  },

  /** Removes a supply item from the house settings supplies array. */
  async removeSupplyItem(
    houseId: string,
    currentSupplies: { id: string; label: string; icon: string; col: string; bg: string }[],
    itemId: string
  ): Promise<void> {
    const updated = currentSupplies.filter(s => s.id !== itemId);
    const settingsRef = ref(db, `house_settings/${houseId}`);
    await update(settingsRef, { supplies: updated });
  },
};
