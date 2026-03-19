import { useState } from "react";
import { House, Member, HouseSettings as HouseSettingsType, MemberProfile, getDisplayName } from "@/lib/househub";
import { Trash2, Plus } from "lucide-react";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";
import { db } from "@/lib/firebase";
import { ref, remove } from "firebase/database";
import { useTranslation } from "react-i18next";

interface HouseSettingsProps {
  house:                  House;
  members:                Member[];
  houseSettings:          HouseSettingsType;
  cleaningRotationOrder:  string[];
  suppliesRotationOrder:  string[];
  onClose:                () => void;
  onMembersChange:        (members: Member[]) => void;
  onSettingsChange:       (settings: HouseSettingsType) => void;
  onCleaningOrderChange:  (order: string[]) => void;
  onSuppliesOrderChange:  (order: string[]) => void;
  memberProfiles:         Record<string, MemberProfile>;
}

const HouseSettingsScreen = ({
  house,
  members,
  houseSettings,
  cleaningRotationOrder,
  suppliesRotationOrder,
  onClose,
  onMembersChange,
  onSettingsChange,
  onCleaningOrderChange,
  onSuppliesOrderChange,
  memberProfiles,
}: HouseSettingsProps) => {
  const { t } = useTranslation();
  const [settingsTab, setSettingsTab] = useState("members");

  // Draft copies — start as clones of the original props
  const [draftMembers, setDraftMembers] = useState<Member[]>(members);
  const [draftSettings, setDraftSettings] = useState<HouseSettingsType>(houseSettings);
  const [draftCleaningOrder, setDraftCleaningOrder] = useState<string[]>(cleaningRotationOrder);
  const [draftSuppliesOrder, setDraftSuppliesOrder] = useState<string[]>(suppliesRotationOrder);

  // Track if anything has changed
  const [hasChanges, setHasChanges] = useState(false);

  // Track if save is in progress
  const [isSaving, setIsSaving] = useState(false);

  // Track previous tab for unsaved changes warning
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);


  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      // Save settings (cleaning, supplies, rotation orders)
      const finalSettings = {
        ...draftSettings,
        cleaning_rotation_order: draftCleaningOrder,
        supplies_rotation_order: draftSuppliesOrder,
      };
      await houseService.saveHouseSettings(house.id, finalSettings);

      // Save member additions (members added to draftMembers that aren't in original)
      const originalIds = members.map(m => m.id);
      const newMembers = draftMembers.filter(m => !originalIds.includes(m.id));
      if (newMembers.length > 0) {
        await houseService.insertMembers(house.id, newMembers.map(m => m.name));
      }

      // Save member removals (members in original that aren't in draftMembers)
      const draftIds = draftMembers.map(m => m.id);
      const removedMembers = members.filter(m => !draftIds.includes(m.id));
      for (const m of removedMembers) {
        await remove(ref(db, `members/${house.id}/${m.id}`));
      }

      // Notify parent components
      onMembersChange(draftMembers);
      onSettingsChange(finalSettings);
      onCleaningOrderChange(draftCleaningOrder);
      onSuppliesOrderChange(draftSuppliesOrder);

      setHasChanges(false);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => {
    setDraftMembers(members);
    setDraftSettings(houseSettings);
    setDraftCleaningOrder(cleaningRotationOrder);
    setDraftSuppliesOrder(suppliesRotationOrder);
    setHasChanges(false);
  };

  const SETTINGS_TABS = [
    { id: "members",  label: t('settings.tabs.members', "Members"),  emoji: "👥" },
    { id: "supplies", label: t('settings.tabs.supplies', "Supplies"), emoji: "🛒" },
    { id: "cleaning", label: t('settings.tabs.cleaning', "Cleaning"), emoji: "🧹" },
    { id: "rotation", label: t('settings.tabs.rotation', "Rotation"), emoji: "🔄" },
  ];

  return (
    <div
      className="flex flex-col bg-white overflow-hidden relative"
      style={{
        borderRadius: "20px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)",
        maxHeight: "88vh",
      }}
    >
      {/* Hero strip */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #770042 0%, #4a0029 100%)",
          padding: "20px 20px 20px 20px",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D4A373, transparent)" }}
        />
        <div
          className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff, transparent)" }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.15)", zIndex: 20 }}
        >
          <span style={{ color: "white", fontSize: "14px", fontWeight: 900 }}>✕</span>
        </button>

        {/* Title */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⚙️</span>
            <span
              className="text-lg font-display font-black tracking-tight"
              style={{ color: "#D4A373" }}
            >
              {t('settings.house_settings', 'House Settings')}
            </span>
          </div>
          <p className="text-white/55 text-xs font-medium">
            {house.name.toUpperCase()} · {t('settings.subtitle', 'Manage your shared home')}
          </p>
        </div>
      </div>

      {/* Internal tab bar */}
      <div className="flex shrink-0 border-b border-border/40 bg-white px-2 pt-2 overflow-x-auto scrollbar-hide">
        {SETTINGS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (hasChanges && tab.id !== settingsTab) {
                setPendingTab(tab.id);
                setShowUnsavedWarning(true);
              } else {
                setSettingsTab(tab.id);
              }
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 ${
              settingsTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base">{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5">
        {settingsTab === "members" && (
          <MembersTab
            house={house}
            members={draftMembers}
            memberProfiles={memberProfiles}
            onMembersChange={(newMembers) => {
              setDraftMembers(newMembers);
              setHasChanges(true);
            }}
          />
        )}
        {settingsTab === "supplies" && (
          <SuppliesTab
            house={house}
            members={draftMembers}
            houseSettings={draftSettings}
            memberProfiles={memberProfiles}
            onSettingsChange={(newSettings) => {
              setDraftSettings(newSettings);
              setHasChanges(true);
            }}
          />
        )}

        {settingsTab === "cleaning" && (
          <CleaningTab
            house={house}
            members={draftMembers}
            houseSettings={draftSettings}
            memberProfiles={memberProfiles}
            onSettingsChange={(newSettings) => {
              setDraftSettings(newSettings);
              setHasChanges(true);
            }}
          />
        )}
        {settingsTab === "rotation" && (
          <RotationTab
            house={house}
            members={draftMembers}
            houseSettings={draftSettings}
            cleaningRotationOrder={draftCleaningOrder}
            suppliesRotationOrder={draftSuppliesOrder}
            memberProfiles={memberProfiles}
            onCleaningOrderChange={(newOrder) => {
              setDraftCleaningOrder(newOrder);
              setHasChanges(true);
            }}
            onSuppliesOrderChange={(newOrder) => {
              setDraftSuppliesOrder(newOrder);
              setHasChanges(true);
            }}
            onSettingsChange={(newSettings) => {
              setDraftSettings(newSettings);
              setHasChanges(true);
            }}
          />
        )}

      </div>

      {/* ── Unsaved Changes Warning Dialog ── */}
      {showUnsavedWarning && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", borderRadius: "20px" }}
        >
          <div className="bg-white rounded-2xl p-5 w-full max-w-[300px] shadow-xl">
            <p className="font-display font-black text-base text-foreground mb-1">
              {t('settings.unsaved_changes', 'Unsaved Changes')}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('settings.unsaved_warning_desc', 'You have unsaved changes in this tab. What would you like to do?')}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  saveAllChanges().then(() => {
                    if (pendingTab) setSettingsTab(pendingTab);
                    setPendingTab(null);
                  });
                }}
                className="w-full h-10 rounded-xl font-bold text-sm text-white"
                style={{ backgroundColor: "#770042" }}
              >
                {t('settings.save_switch', 'Save & Switch Tab')}
              </button>
              <button
                onClick={() => {
                  discardChanges();
                  setShowUnsavedWarning(false);
                  if (pendingTab) setSettingsTab(pendingTab);
                  setPendingTab(null);
                }}
                className="w-full h-10 rounded-xl font-bold text-sm border-2 border-border text-muted-foreground"
              >
                {t('settings.discard_switch', 'Discard & Switch Tab')}
              </button>
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  setPendingTab(null);
                }}
                className="w-full h-10 rounded-xl font-bold text-sm text-muted-foreground"
              >
                {t('settings.stay_here', 'Stay Here')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save Bar — slides up when hasChanges is true ── */}
      <div
        className="shrink-0 px-4 py-3 flex gap-3"
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          transform: hasChanges ? "translateY(0)" : "translateY(100%)",
          opacity: hasChanges ? 1 : 0,
          transition: "transform 0.3s cubic-bezier(0.34,1.2,0.64,1), opacity 0.2s ease",
          pointerEvents: hasChanges ? "auto" : "none",
          backgroundColor: "white",
        }}
      >
        {/* Unsaved dot indicator */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full shadow-sm border border-border/30">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#770042" }} />
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {t('settings.unsaved_changes_indicator', 'Unsaved changes')}
          </span>
        </div>

        <button
          onClick={discardChanges}
          className="flex-1 h-11 rounded-2xl border-2 font-display font-bold text-sm transition-colors"
          style={{ borderColor: "rgba(119,0,66,0.25)", color: "#770042" }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(119,0,66,0.06)"}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
        >
          {t('common.discard', 'Discard')}
        </button>

        <button
          onClick={saveAllChanges}
          disabled={isSaving}
          className="flex-[2] h-11 rounded-2xl font-display font-black text-sm text-white shadow-md disabled:opacity-60 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #770042 0%, #5a0032 100%)" }}
        >
          {isSaving ? t('common.saving', 'Saving...') : t('common.save_changes', 'Save Changes')}
        </button>
      </div>

      <style>{`
        @keyframes slide-up-full {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

    </div>
  );
};

const MembersTab = ({
  house,
  members,
  memberProfiles,
  onMembersChange,
}: {
  house:            House;
  members:          Member[];
  memberProfiles:   Record<string, MemberProfile>;
  onMembersChange:  (m: Member[]) => void;
}) => {
  const { t } = useTranslation();
  const [newName,  setNewName]  = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const addMember = () => {
    if (!newName.trim()) return;
    const tempMember: Member = {
      id: `temp_${Date.now()}`,
      house_id: house.id,
      name: newName.trim(),
      created_at: new Date().toISOString(),
    };
    onMembersChange([...members, tempMember]);
    setNewName("");
  };

  const removeMember = (memberId: string) => {
    onMembersChange(members.filter(m => m.id !== memberId));
    setRemoving(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
        {t('settings.current_members', "Current Members")} ({members.length})
      </p>

      {members.map(m => (
        <div key={m.id}
          className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border animate-fade-up">
          <Avatar member={m} profile={memberProfiles[m.id]} name={getDisplayName(m.id, members, memberProfiles)} size={40} radius={12} fontSize={16} />
          <span className="flex-1 font-semibold text-foreground">{getDisplayName(m.id, members, memberProfiles)}</span>
          {removing === m.id ? (
            <div className="flex gap-2">
              <button
                onClick={() => removeMember(m.id)}
                className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs active:scale-95 transition-all"
              >{t('common.confirm', "Confirm")}</button>
              <button
                onClick={() => setRemoving(null)}
                className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs active:scale-95 transition-all"
              >{t('common.cancel', "Cancel")}</button>
            </div>
          ) : (
            <button
              onClick={() => setRemoving(m.id)}
              className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}

      {/* Add new member */}
      <div className="flex gap-2 mt-2">
        <input
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground font-medium focus:outline-none focus:border-primary transition-colors"
          placeholder={t('settings.new_member_placeholder', "New member name...")}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addMember()}
        />
        <button
          onClick={addMember}
          disabled={!newName.trim()}
          className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 transition-all active:scale-95"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

const EMOJI_OPTIONS = [
  "💧","🔥","🫧","⚡","🌐","🛍️","🧻","☕",
  "🍞","🥛","🧴","🪣","🧽","🔋","💡","🗑️",
  "📦","🧊","🥤","🧂","🫙","🪥","🧹","🪴"
];

const SuppliesTab = ({
  house,
  members,
  houseSettings,
  memberProfiles,
  onSettingsChange,
}: {
  house:            House;
  members:          Member[];
  houseSettings:    HouseSettingsType;
  memberProfiles:   Record<string, MemberProfile>;
  onSettingsChange: (s: HouseSettingsType) => void;
}) => {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel,    setNewLabel]    = useState("");
  const [newEmoji,    setNewEmoji]    = useState("📦");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [removing,    setRemoving]    = useState<string | null>(null);

  const toggleMemberFromSupply = (
    itemName: string,
    memberId: string,
    currentlyExcluded: boolean
  ) => {
    const currentExcluded = houseSettings.excluded_members?.[itemName] ?? [];

    // Prevent removing last active member
    const activeCount = members.length - currentExcluded.length;
    if (!currentlyExcluded && activeCount <= 1) {
      alert(t('settings.alerts.min_one_member', "At least 1 person must remain in the rotation."));
      return;
    }

    const updatedExcluded = currentlyExcluded
      ? currentExcluded.filter(id => id !== memberId)
      : [...currentExcluded, memberId];

    const updatedSettings = {
      ...houseSettings,
      excluded_members: {
        ...houseSettings.excluded_members,
        [itemName]: updatedExcluded,
      }
    };
    onSettingsChange(updatedSettings);
  };

  const addSupply = () => {
    if (!newLabel.trim()) return;
    const newSupply = {
      id: newLabel.trim(), label: newLabel.trim(), icon: newEmoji,
      bg: "rgba(100,100,100,0.08)", col: "#6B7280"
    };
    const updatedSupplies = [...houseSettings.supplies, newSupply];
    onSettingsChange({ ...houseSettings, supplies: updatedSupplies });
    setNewLabel(""); setNewEmoji("📦"); setShowAddForm(false);
  };

  const removeSupply = (supplyId: string) => {
    const updatedSupplies = houseSettings.supplies.filter(s => s.id !== supplyId);
    onSettingsChange({ ...houseSettings, supplies: updatedSupplies });
    setRemoving(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
        {t('settings.shared_supplies', "Shared Supplies")} ({houseSettings.supplies.length})
      </p>

      {houseSettings.supplies.map(s => (
        <div key={s.id} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
            <span className="text-2xl w-10 text-center">{s.icon}</span>
            <span className="flex-1 font-semibold text-foreground">{s.label}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpandedItem(expandedItem === s.id ? null : s.id)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all text-xs font-bold"
              >
                {expandedItem === s.id ? `▲ ${t('common.hide', "Hide")}` : `👥 ${t('settings.members.title', "Members")}`}
              </button>
              {removing === s.id ? (
                <div className="flex gap-2">
                  <button onClick={() => removeSupply(s.id)}
                    className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs active:scale-95 transition-all">
                    {t('common.confirm', "Confirm")}
                  </button>
                  <button onClick={() => setRemoving(null)}
                    className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs active:scale-95 transition-all">
                    {t('common.cancel', "Cancel")}
                  </button>
                </div>
              ) : (
                <button onClick={() => setRemoving(s.id)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {expandedItem === s.id && (
            <div className="mt-2 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col gap-2 mx-1"
              style={{ animation: "fade-in 0.2s ease both" }}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                {t('settings.who_buys', { item: s.label, defaultValue: `Who buys ${s.label}?` })}
              </p>
              {members.map(m => {
                const excluded = (houseSettings.excluded_members?.[s.label] ?? []).includes(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:0">
                    <Avatar member={m} profile={memberProfiles[m.id]} name={getDisplayName(m.id, members, memberProfiles)} size={32} radius={9} fontSize={12} />
                    <span className={`flex-1 font-semibold text-sm ${excluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {getDisplayName(m.id, members, memberProfiles)}
                    </span>
                    {excluded && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-2">
                        {t('settings.excluded', "Excluded")}
                      </span>
                    )}
                    <button
                      onClick={() => toggleMemberFromSupply(s.label, m.id, excluded)}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${!excluded ? "bg-primary" : "bg-muted border border-border"}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${!excluded ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ {t('settings.alerts.min_one_member', "At least 1 person must remain in each rotation.")}
              </p>
            </div>
          )}
        </div>
      ))}

      {showAddForm ? (
        <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col gap-3 mt-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('settings.pick_emoji', "Pick an emoji")}</p>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setNewEmoji(e)}
                className={`w-10 h-10 rounded-xl text-xl transition-all active:scale-95 ${newEmoji === e ? "bg-primary/20 border-2 border-primary scale-110" : "bg-card border border-border hover:bg-muted"}`}>
                {e}
              </button>
            ))}
          </div>
          <input
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground font-medium focus:outline-none focus:border-primary transition-colors"
            placeholder={t('settings.supply_name_placeholder', "Supply name...")}
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addSupply()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={addSupply} disabled={!newLabel.trim()}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-95 transition-all">
              {t('settings.add_supply', "Add Supply")}
            </button>
            <button onClick={() => { setShowAddForm(false); setNewLabel(""); setNewEmoji("📦"); }}
              className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-95 transition-all">
              {t('common.cancel', "Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 font-semibold text-sm transition-all mt-1">
          <Plus size={16} /> {t('settings.add_new_supply_btn', "Add new supply")}
        </button>
      )}
    </div>
  );
};


const CleaningTab = ({
  house,
  members,
  houseSettings,
  memberProfiles,
  onSettingsChange,
}: {
  house:            House;
  members:          Member[];
  houseSettings:    HouseSettingsType;
  memberProfiles:   Record<string, MemberProfile>;
  onSettingsChange: (s: HouseSettingsType) => void;
}) => {
  const { t } = useTranslation();
  const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const toggleMemberFromCleaning = (
    memberId: string,
    currentlyExcluded: boolean
  ) => {
    const currentExcluded = houseSettings.excluded_members?.["cleaning"] ?? [];
    const activeCount = members.length - currentExcluded.length;

    if (!currentlyExcluded && activeCount <= 1) {
      alert(t('settings.alerts.min_one_member_cleaning', "At least 1 person must remain in the cleaning rotation."));
      return;
    }

    const newExcluded = currentlyExcluded
      ? currentExcluded.filter(id => id !== memberId)
      : [...currentExcluded, memberId];

    const updatedSettings = {
      ...houseSettings,
      excluded_members: {
        ...houseSettings.excluded_members,
        cleaning: newExcluded,
      }
    };
    onSettingsChange(updatedSettings);
  };

  const update = (changes: Partial<HouseSettingsType>) => {
    const updated = { ...houseSettings, ...changes };
    onSettingsChange(updated);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Toggle */}
      <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
        <div>
          <p className="font-bold text-sm text-foreground">{t('cleaning.rotation_label', "Cleaning Rotation")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('settings.track_cleaning_desc', "Track who cleans and when")}</p>
        </div>
        <button
          onClick={() => update({ cleaning_enabled: !houseSettings.cleaning_enabled })}
          className={`w-12 h-6 rounded-full transition-all duration-300 relative ${houseSettings.cleaning_enabled ? "bg-primary" : "bg-muted border border-border"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${houseSettings.cleaning_enabled ? "left-6" : "left-0.5"}`} />
        </button>
      </div>

      {houseSettings.cleaning_enabled && (
        <>
          {/* Frequency */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('settings.how_often', "How often?")}</p>
            <div className="flex gap-2">
              {[
                { v: "weekly",   l: t('settings.freq.weekly', "Weekly")       },
                { v: "biweekly", l: t('settings.freq.biweekly', "Every 2 weeks") },
                { v: "monthly",  l: t('settings.freq.monthly', "Monthly")       },
              ].map(opt => (
                <button key={opt.v}
                  onClick={() => update({ cleaning_frequency: opt.v as any })}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs border-2 transition-all active:scale-95
                    ${houseSettings.cleaning_frequency === opt.v
                      ? "border-primary bg-primary/8 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Day */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('settings.which_day', "Which day?")}</p>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((d, i) => (
                <button key={i}
                  onClick={() => update({ cleaning_day: i })}
                  className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all active:scale-95
                    ${houseSettings.cleaning_day === i
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}>
                  {t(`common.days_short.${i}`, d)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              {t('settings.who_participates_cleaning', "Who participates in cleaning?")}
            </p>
            <div className="flex flex-col gap-0 rounded-2xl bg-card border border-border overflow-hidden">
              {members.map((m, idx) => {
                const excluded = (houseSettings.excluded_members?.["cleaning"] ?? []).includes(m.id);
                return (
                  <div key={m.id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${idx < members.length - 1 ? "border-b border-border/60" : ""}`}>
                    <Avatar member={m} profile={memberProfiles[m.id]} name={getDisplayName(m.id, members, memberProfiles)} size={34} radius={10} fontSize={13} />
                    <span className={`flex-1 font-semibold text-sm ${excluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {getDisplayName(m.id, members, memberProfiles)}
                    </span>
                    {excluded && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-2">
                        {t('settings.excluded', "Excluded")}
                      </span>
                    )}
                    <button
                      onClick={() => toggleMemberFromCleaning(m.id, excluded)}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${!excluded ? "bg-primary" : "bg-muted border border-border"}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${!excluded ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ {t('settings.alerts.min_one_member_cleaning', "At least 1 person must remain in the cleaning rotation.")}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

const RotationTab = ({
  house,
  members,
  houseSettings,
  cleaningRotationOrder,
  suppliesRotationOrder,
  onCleaningOrderChange,
  onSuppliesOrderChange,
  memberProfiles,
  onSettingsChange,
}: {
  house:                  House;
  members:                Member[];
  houseSettings:          HouseSettingsType;
  cleaningRotationOrder:  string[];
  suppliesRotationOrder:  string[];
  onCleaningOrderChange:  (order: string[]) => void;
  onSuppliesOrderChange:  (order: string[]) => void;
  memberProfiles:         Record<string, MemberProfile>;
  onSettingsChange:       (s: HouseSettingsType) => void;
}) => {
  const { t } = useTranslation();
  const moveItem = (arr: string[], idx: number, dir: "up"|"down") => {
    const newArr   = [...arr];
    const swapIdx  = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newArr.length) return newArr;
    [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
    return newArr;
  };

  const saveCleaningOrder = (newOrder: string[]) => {
    const updated = { ...houseSettings, cleaning_rotation_order: newOrder };
    onCleaningOrderChange(newOrder);
    onSettingsChange(updated);
  };

  const saveSuppliesOrder = (newOrder: string[]) => {
    const updated = { ...houseSettings, supplies_rotation_order: newOrder };
    onSuppliesOrderChange(newOrder);
    onSettingsChange(updated);
  };

  const renderList = (
    title:   string,
    order:   string[],
    onSave:  (o: string[]) => void
  ) => (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
      {order.map((id, idx) => {
        const member = members.find(m => m.id === id);
        if (!member) return null;
        return (
          <div key={id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border-2 border-border hover:border-primary/20 transition-all">
            <span className="w-6 text-center font-black text-primary text-sm shrink-0">{idx + 1}</span>
            <Avatar member={member} profile={memberProfiles[id]} name={getDisplayName(id, members, memberProfiles)} size={36} radius={10} fontSize={14} />
            <span className="flex-1 font-semibold text-sm text-foreground">{getDisplayName(id, members, memberProfiles)}</span>
            <div className="flex gap-1">
              <button
                disabled={idx === 0}
                onClick={() => onSave(moveItem(order, idx, "up"))}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/80 transition-all active:scale-90 font-bold text-xs">
                ▲
              </button>
              <button
                disabled={idx === order.length - 1}
                onClick={() => onSave(moveItem(order, idx, "down"))}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/80 transition-all active:scale-90 font-bold text-xs">
                ▼
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {houseSettings.cleaning_enabled && renderList(`🧹 ${t('settings.cleaning_order', "Cleaning Order")}`, cleaningRotationOrder, saveCleaningOrder)}
      {renderList(`🛒 ${t('settings.supplies_order', "Supplies Order")}`, suppliesRotationOrder, saveSuppliesOrder)}
    </div>
  );
};

export default HouseSettingsScreen;



