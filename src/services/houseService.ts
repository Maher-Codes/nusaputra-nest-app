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
import { genCode, Member, CleanRecord, Purchase, SupplyResponsibility, Report, ReportNotification, TravelMode, TravelIOU, TopContributor } from "@/lib/househub";

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `NNN-${year}-${random}`;
}

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
  // MEMBER PROFILES
  // ----------------------------------------------------------

  /** Fetches a specific member's profile. */
  async getMemberProfile(houseId: string, memberId: string): Promise<any | null> {
    const profileRef = ref(db, `member_profiles/${houseId}/${memberId}`);
    const snapshot = await get(profileRef);
    return snapshot.exists() ? snapshot.val() : null;
  },

  /** Saves a member's profile. */
  async saveMemberProfile(houseId: string, profile: any): Promise<void> {
    const profileRef = ref(db, `member_profiles/${houseId}/${profile.id}`);
    await set(profileRef, {
      ...profile,
      updated_at: new Date().toISOString()
    });
  },

  /** Fetches all member profiles for a house. */
  async getAllMemberProfiles(houseId: string): Promise<Record<string, any>> {
    const profilesRef = ref(db, `member_profiles/${houseId}`);
    const snapshot = await get(profilesRef);
    return snapshot.exists() ? snapshot.val() : {};
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

  // ----------------------------------------------------------
  // REPORTS & NOTIFICATIONS
  // ----------------------------------------------------------

  /** Submits a new report and creates initial notifications. */
  async submitReport(
    houseId: string, 
    report: Omit<Report, "id" | "created_at" | "reference_number">
  ): Promise<string> {
    const reportsRef = ref(db, `reports/${houseId}`);
    const newReportRef = push(reportsRef);
    const reportId = newReportRef.key!;
    const refNum = generateReferenceNumber();
    const now = new Date().toISOString();

    const reportData: Report = {
      ...report,
      id: reportId,
      reference_number: refNum,
      created_at: now,
      status: report.status || "pending",
      university_response: report.university_response || "",
    };

    // Convert co_signers and co_signer_requests arrays to objects for Firebase
    const reportToSave = {
      ...reportData,
      co_signers: report.co_signers.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
      co_signer_requests: report.co_signer_requests.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
    };

    await set(newReportRef, reportToSave);

    // 1. Notification for reported person
    await this.createNotification({
      house_id: houseId,
      member_id: report.reported_member_id,
      type: "reported_notice",
      report_id: reportId,
      message: "A concern has been raised in your house regarding shared responsibilities. Please ensure you are fulfilling your duties faithfully.",
      read: false,
    });

    // 2. Notification for reporter
    await this.createNotification({
      house_id: houseId,
      member_id: report.reporter_member_id,
      type: "report_confirmed",
      report_id: reportId,
      message: `Your report has been submitted. Reference: ${refNum}`,
      read: false,
    });

    // 3. Notifications for co-signers
    for (const memberId of report.co_signer_requests) {
      await this.createNotification({
        house_id: houseId,
        member_id: memberId,
        type: "co_sign_request",
        report_id: reportId,
        message: "A housemate has filed a report and is asking if you share the same concern. You can choose to support or decline — this is completely optional.",
        read: false,
      });
    }

    return refNum;
  },

  /** Creates a single notification row. */
  async createNotification(notification: Omit<ReportNotification, "id" | "created_at">): Promise<void> {
    const notifsRef = ref(db, `report_notifications/${notification.house_id}`);
    const newNotifRef = push(notifsRef);
    await set(newNotifRef, {
      ...notification,
      id: newNotifRef.key,
      created_at: new Date().toISOString(),
    });
  },

  /** Fetches all reports for a house (or all reports if houseId is empty). */
  async getReportsForHouse(houseId: string): Promise<Report[]> {
    const reportsRef = houseId ? ref(db, `reports/${houseId}`) : ref(db, "reports");
    const snapshot = await get(reportsRef);
    if (!snapshot.exists()) return [];
    
    const data = snapshot.val();
    const reports: Report[] = [];

    if (houseId) {
      // Single house data
      Object.values(data).forEach((r: any) => {
        reports.push({
          ...r,
          co_signers: r.co_signers ? Object.keys(r.co_signers) : [],
          co_signer_requests: r.co_signer_requests ? Object.keys(r.co_signer_requests) : [],
        } as Report);
      });
    } else {
      // Global data (root 'reports' node)
      Object.keys(data).forEach(hId => {
        const houseReports = data[hId];
        Object.values(houseReports).forEach((r: any) => {
          reports.push({
            ...r,
            co_signers: r.co_signers ? Object.keys(r.co_signers) : [],
            co_signer_requests: r.co_signer_requests ? Object.keys(r.co_signer_requests) : [],
          } as Report);
        });
      });
    }
    
    return reports.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  /** Fetches notifications for a specific member. */
  async getNotificationsForMember(houseId: string, memberId: string): Promise<ReportNotification[]> {
    const notifsRef = ref(db, `report_notifications/${houseId}`);
    const snapshot = await get(notifsRef);
    if (!snapshot.exists()) return [];

    const allNotifs = Object.values(snapshot.val()) as ReportNotification[];
    return allNotifs.filter(n => n.member_id === memberId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  /** Marks a notification as read. */
  async markNotificationRead(houseId: string, notificationId: string): Promise<void> {
    const notifRef = ref(db, `report_notifications/${houseId}/${notificationId}`);
    await update(notifRef, { read: true });
  },

  /** Adds a co-signer to a report. */
  async addCoSigner(houseId: string, reportId: string, memberId: string): Promise<void> {
    const coSignerRef = ref(db, `reports/${houseId}/${reportId}/co_signers/${memberId}`);
    const requestRef = ref(db, `reports/${houseId}/${reportId}/co_signer_requests/${memberId}`);
    
    await set(coSignerRef, true);
    await remove(requestRef);
  },

  /** Declines a co-sign request. */
  async declineCoSign(houseId: string, reportId: string, memberId: string): Promise<void> {
    const requestRef = ref(db, `reports/${houseId}/${reportId}/co_signer_requests/${memberId}`);
    await remove(requestRef);
  },

  /** Updates report status and optionally sends notification. */
  async updateReportStatus(
    houseId: string, 
    reportId: string, 
    status: Report["status"], 
    response?: string
  ): Promise<void> {
    const reportRef = ref(db, `reports/${houseId}/${reportId}`);
    const updates: any = { status };
    if (response !== undefined) updates.university_response = response;
    
    await update(reportRef, updates);

    if (response) {
      const snapshot = await get(reportRef);
      if (snapshot.exists()) {
        const report = snapshot.val();
        const msg = `The university has reviewed your house report (Ref: ${report.reference_number}) and has responded. Please check in with your student affairs office if needed.`;
        
        // Notify reporter
        await this.createNotification({
          house_id: houseId,
          member_id: report.reporter_member_id,
          type: "university_response",
          report_id: reportId,
          message: msg,
          read: false,
        });

        // Notify reported person
        await this.createNotification({
          house_id: houseId,
          member_id: report.reported_member_id,
          type: "university_response",
          report_id: reportId,
          message: msg,
          read: false,
        });
      }
    }
  },

  // ----------------------------------------------------------
  // TRAVEL MODE
  // ----------------------------------------------------------

  /** Activate Travel Mode for a member. */
  async activateTravelMode(houseId: string, travelData: Omit<TravelMode, "id" | "created_at">): Promise<string> {
    const travelRef = ref(db, `travel_modes/${houseId}`);
    const newTravelRef = push(travelRef);
    const travelId = newTravelRef.key!;
    const now = new Date().toISOString();

    const data: TravelMode = {
      ...travelData,
      id: travelId,
      created_at: now,
    };

    await set(newTravelRef, data);

    // Automation: Exclude from cleaning
    await this.updateExcludedMembers(houseId, "cleaning", [
      ...(await this.getExcludedMembers(houseId, "cleaning")),
      travelData.member_id
    ]);

    // Create IOUs for "cover" decisions
    const depDate = new Date(travelData.departure_date);
    const retDate = new Date(travelData.return_date);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const period = `${depDate.getDate()} ${monthNames[depDate.getMonth()]} – ${retDate.getDate()} ${monthNames[retDate.getMonth()]}`;

    const settings = await this.getHouseSettings(houseId);
    const supplies = settings?.supplies || [];

    // Handover logic: If traveller is currently "next", advance or reassign
    const resps = await this.getSupplyResponsibilities(houseId);
    for (const resp of resps) {
      if (resp.next_member_id === travelData.member_id) {
        const supply = supplies.find((s: any) => s.label === resp.item_name);
        if (!supply) continue;
        
        const decision = travelData.supply_decisions[supply.id] || "skip";
        if (decision === "skip") {
          // Find next available member in order
          const members = await this.getMembers(houseId);
          const settings = await this.getHouseSettings(houseId);
          const order = settings?.supplies_rotation_order || members.map((m: any) => m.id);
          const excluded = settings?.excluded_members?.[resp.item_name] || [];
          // Also skip the traveller + any other active travellers
          const activeTravelModes = await this.getActiveTravelModes(houseId);
          const currentlyTraveling = activeTravelModes.map(t => t.member_id);
          const allSkip = Array.from(new Set([...excluded, ...currentlyTraveling, travelData.member_id]));

          const activeOrder = order.filter((id: string) => !allSkip.includes(id));
          if (activeOrder.length > 0) {
            const currentIdx = order.indexOf(travelData.member_id);
            // This is simplified; ideally we find the next in activeOrder that follows the traveler in order
            // For now, just take the first one in activeOrder that is NOT the traveler
            const nextId = activeOrder[0]; 
            await this.updateNextBuyer(houseId, resp.item_name, nextId);
          }
        } else if (decision === "cover") {
          const coverMemberId = travelData.cover_assignments[supply.id];
          if (coverMemberId) {
            await this.updateNextBuyer(houseId, resp.item_name, coverMemberId);
          }
        }
      }
    }

    for (const supplyId of Object.keys(travelData.supply_decisions)) {
      if (travelData.supply_decisions[supplyId] === "cover") {
        const coverMemberId = travelData.cover_assignments[supplyId];
        const supply = supplies.find((s: any) => s.id === supplyId);
        if (coverMemberId && supply) {
          await this.createTravelIOU(houseId, {
            house_id: houseId,
            traveler_member_id: travelData.member_id,
            cover_member_id: coverMemberId,
            supply_item_label: supply.label,
            supply_item_icon: supply.icon,
            travel_id: travelId,
            period,
            settled: false,
            settled_at: null,
          });

          // Notify cover person
          const traveler = (await this.getMembers(houseId)).find(m => m.id === travelData.member_id);
          await this.createNotification({
            house_id: houseId,
            member_id: coverMemberId,
            type: "university_response", // Reusing for travel notice
            report_id: "travel-" + travelId,
            message: `${traveler?.name || "A housemate"} is travelling ${period}. You've been asked to cover ${supply.icon} ${supply.label} during this time. They'll settle up when they return. 🤝`,
            read: false,
          });
        }
      }
    }

    return travelId;
  },


  /** Get current excluded members array for a key. */
  async getExcludedMembers(houseId: string, key: string): Promise<string[]> {
    const settings = await this.getHouseSettings(houseId);
    return settings?.excluded_members?.[key] || [];
  },

  /** Get all active travel modes for a house. */
  async getActiveTravelModes(houseId: string): Promise<TravelMode[]> {
    const travelRef = ref(db, `travel_modes/${houseId}`);
    const snapshot = await get(travelRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return (Object.values(data) as TravelMode[]).filter(t => t.status === "active");
  },

  /** End Travel Mode (mark as returned). */
  async endTravelMode(houseId: string, travelId: string): Promise<void> {
    const travelRef = ref(db, `travel_modes/${houseId}/${travelId}`);
    const snapshot = await get(travelRef);
    if (!snapshot.exists()) return;
    const travelData = snapshot.val() as TravelMode;

    await update(travelRef, { status: "returned" });

    // Automation: Remove from cleaning exclusion
    const excluded = await this.getExcludedMembers(houseId, "cleaning");
    await this.updateExcludedMembers(houseId, "cleaning", excluded.filter(id => id !== travelData.member_id));
  },

  /** Update return date. */
  async updateReturnDate(houseId: string, travelId: string, newReturnDate: string): Promise<void> {
    const travelRef = ref(db, `travel_modes/${houseId}/${travelId}`);
    await update(travelRef, { return_date: newReturnDate });
  },

  /** Get unsettle IOUs for a house. */
  async getUnsettledIOUs(houseId: string): Promise<TravelIOU[]> {
    const iousRef = ref(db, `travel_ious/${houseId}`);
    const snapshot = await get(iousRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return (Object.values(data) as TravelIOU[]).filter(iou => !iou.settled);
  },

  /** Mark an IOU as settled. */
  async settleIOU(houseId: string, iouId: string): Promise<void> {
    const iouRef = ref(db, `travel_ious/${houseId}/${iouId}`);
    await update(iouRef, { 
      settled: true, 
      settled_at: new Date().toISOString() 
    });
  },

  /** Create a travel IOU. */
  async createTravelIOU(houseId: string, iou: Omit<TravelIOU, "id" | "created_at">): Promise<void> {
    const iousRef = ref(db, `travel_ious/${houseId}`);
    const newIOURef = push(iousRef);
    await set(newIOURef, {
      ...iou,
      id: newIOURef.key,
      created_at: new Date().toISOString(),
    });
  },

  // ----------------------------------------------------------
  // TOP CONTRIBUTOR / REPORTS
  // ----------------------------------------------------------

  /** Save top contributor for a month. */
  async saveTopContributor(houseId: string, contributor: TopContributor): Promise<void> {
    const topRef = ref(db, `house_settings/${houseId}/top_contributor`);
    await set(topRef, contributor);
  },

  /** Get current top contributor. */
  async getTopContributor(houseId: string): Promise<TopContributor | null> {
    const topRef = ref(db, `house_settings/${houseId}/top_contributor`);
    const snapshot = await get(topRef);
    if (!snapshot.exists()) return null;
    return snapshot.val() as TopContributor;
  },
};
