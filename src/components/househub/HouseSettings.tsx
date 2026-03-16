import { useState } from "react";
import { House, Member, HouseSettings as HouseSettingsType } from "@/lib/househub";
import { Trash2, Plus } from "lucide-react";
import Avatar from "./Avatar";
import { houseService } from "@/services/houseService";
import { supabase } from "@/integrations/supabase/client";


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
}

const SETTINGS_TABS = [
  { id: "members",  label: "Members",  emoji: "👥" },
  { id: "supplies", label: "Supplies", emoji: "🛒" },
  { id: "cleaning", label: "Cleaning", emoji: "🧹" },
  { id: "rotation", label: "Rotation", emoji: "🔄" },
];

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
}: HouseSettingsProps) => {

  const [settingsTab, setSettingsTab] = useState("members");

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      style={{ animation: "slide-up-full 0.35s cubic-bezier(0.34,1.2,0.64,1) both" }}
    >
      {/* Header */}
      <div className="px-5 pt-10 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-xl text-foreground">House Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{house.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
        >✕</button>
      </div>

      {/* Internal tab bar */}
      <div className="flex gap-1.5 px-4 py-3 border-b border-border overflow-x-auto scrollbar-hide">
        {SETTINGS_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSettingsTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-200
              ${settingsTab === t.id
                ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content area */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {settingsTab === "members" && (
          <MembersTab
            house={house}
            members={members}
            onMembersChange={onMembersChange}
          />
        )}
        {settingsTab === "supplies" && (
          <SuppliesTab
            house={house}
            members={members}
            houseSettings={houseSettings}
            onSettingsChange={onSettingsChange}
          />
        )}

        {settingsTab === "cleaning" && (
          <CleaningTab
            house={house}
            members={members}
            houseSettings={houseSettings}
            onSettingsChange={onSettingsChange}
          />
        )}
        {settingsTab === "rotation" && (
          <RotationTab
            house={house}
            members={members}
            houseSettings={houseSettings}
            cleaningRotationOrder={cleaningRotationOrder}
            suppliesRotationOrder={suppliesRotationOrder}
            onCleaningOrderChange={onCleaningOrderChange}
            onSuppliesOrderChange={onSuppliesOrderChange}
            onSettingsChange={onSettingsChange}
          />
        )}

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
  onMembersChange,
}: {
  house:            House;
  members:          Member[];
  onMembersChange:  (m: Member[]) => void;
}) => {
  const [newName,  setNewName]  = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const addMember = async () => {
    if (!newName.trim() || loading) return;
    setLoading(true);
    try {
      const inserted = await houseService.insertMembers(house.id, [newName.trim()]);
      onMembersChange([...members, inserted[0]]);
      setNewName("");
    } catch (err) {
      console.error("Failed to add member:", err);
    } finally { setLoading(false); }
  };

  const removeMember = async (memberId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      await supabase.from("members").delete().eq("id", memberId);
      onMembersChange(members.filter(m => m.id !== memberId));
      setRemoving(null);
    } catch (err) {
      console.error("Failed to remove member:", err);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
        Current Members ({members.length})
      </p>

      {members.map(m => (
        <div key={m.id}
          className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border animate-fade-up">
          <Avatar name={m.name} size={40} radius={12} fontSize={16} />
          <span className="flex-1 font-semibold text-foreground">{m.name}</span>
          {removing === m.id ? (
            <div className="flex gap-2">
              <button
                onClick={() => removeMember(m.id)}
                className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs active:scale-95 transition-all"
              >Confirm</button>
              <button
                onClick={() => setRemoving(null)}
                className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs active:scale-95 transition-all"
              >Cancel</button>
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
          placeholder="New member name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addMember()}
        />
        <button
          onClick={addMember}
          disabled={!newName.trim() || loading}
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
  onSettingsChange,
}: {
  house:            House;
  members:          Member[];
  houseSettings:    HouseSettingsType;
  onSettingsChange: (s: HouseSettingsType) => void;
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel,    setNewLabel]    = useState("");
  const [newEmoji,    setNewEmoji]    = useState("📦");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [removing,    setRemoving]    = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  const toggleMemberFromSupply = async (
    itemName: string,
    memberId: string,
    currentlyExcluded: boolean
  ) => {
    if (loading) return;

    const currentExcluded = houseSettings.excluded_members?.[itemName] ?? [];

    // Prevent removing last active member
    const activeCount = members.length - currentExcluded.length;
    if (!currentlyExcluded && activeCount <= 1) {
      alert("At least 1 person must remain in the rotation.");
      return;
    }

    const newExcluded = currentlyExcluded
      ? currentExcluded.filter(id => id !== memberId)  // re-include
      : [...currentExcluded, memberId];                 // exclude

    setLoading(true);
    try {
      const updatedSettings = {
        ...houseSettings,
        excluded_members: {
          ...houseSettings.excluded_members,
          [itemName]: newExcluded,
        }
      };
      await houseService.saveHouseSettings(house.id, updatedSettings);
      onSettingsChange(updatedSettings);
    } catch (err) {
      console.error("Failed to update excluded members:", err);
    } finally { setLoading(false); }
  };

  const addSupply = async () => {
    if (!newLabel.trim() || loading) return;
    setLoading(true);
    try {
      const newSupply = {
        id: newLabel.trim(), label: newLabel.trim(), icon: newEmoji,
        bg: "rgba(100,100,100,0.08)", col: "#6B7280"
      };
      const updatedSupplies = [...houseSettings.supplies, newSupply];
      await houseService.saveHouseSettings(house.id, { ...houseSettings, supplies: updatedSupplies });
      if (members.length > 0) {
        await houseService.insertSupplyResponsibilities(house.id, [{
          item_name: newSupply.label,
          next_member_id: members[0].id
        }]);
      }
      onSettingsChange({ ...houseSettings, supplies: updatedSupplies });
      setNewLabel(""); setNewEmoji("📦"); setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add supply:", err);
    } finally { setLoading(false); }
  };

  const removeSupply = async (supplyId: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const updatedSupplies = houseSettings.supplies.filter(s => s.id !== supplyId);
      await houseService.saveHouseSettings(house.id, { ...houseSettings, supplies: updatedSupplies });
      await supabase.from("supply_responsibilities")
        .delete().eq("house_id", house.id).eq("item_name", supplyId);
      onSettingsChange({ ...houseSettings, supplies: updatedSupplies });
      setRemoving(null);
    } catch (err) {
      console.error("Failed to remove supply:", err);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
        Shared Supplies ({houseSettings.supplies.length})
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
                {expandedItem === s.id ? "▲ Hide" : "👥 Members"}
              </button>
              {removing === s.id ? (
                <div className="flex gap-2">
                  <button onClick={() => removeSupply(s.id)}
                    className="px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-xs active:scale-95 transition-all">
                    Confirm
                  </button>
                  <button onClick={() => setRemoving(null)}
                    className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs active:scale-95 transition-all">
                    Cancel
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
                Who buys {s.label}?
              </p>
              {members.map(m => {
                const excluded = (houseSettings.excluded_members?.[s.label] ?? []).includes(m.id);
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                    <Avatar name={m.name} size={32} radius={9} fontSize={12} />
                    <span className={`flex-1 font-semibold text-sm ${excluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {m.name}
                    </span>
                    {excluded && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-2">
                        Excluded
                      </span>
                    )}
                    <button
                      onClick={() => toggleMemberFromSupply(s.label, m.id, excluded)}
                      disabled={loading}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${!excluded ? "bg-primary" : "bg-muted border border-border"}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${!excluded ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ At least 1 person must remain in each rotation.
              </p>
            </div>
          )}
        </div>
      ))}

      {showAddForm ? (
        <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col gap-3 mt-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pick an emoji</p>
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
            placeholder="Supply name..."
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addSupply()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={addSupply} disabled={!newLabel.trim() || loading}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-95 transition-all">
              {loading ? "Adding..." : "Add Supply"}
            </button>
            <button onClick={() => { setShowAddForm(false); setNewLabel(""); setNewEmoji("📦"); }}
              className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-bold text-sm active:scale-95 transition-all">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 font-semibold text-sm transition-all mt-1">
          <Plus size={16} /> Add new supply
        </button>
      )}
    </div>
  );
};


const CleaningTab = ({
  house,
  members,
  houseSettings,
  onSettingsChange,
}: {
  house:            House;
  members:          Member[];
  houseSettings:    HouseSettingsType;
  onSettingsChange: (s: HouseSettingsType) => void;
}) => {
  const [loading, setLoading] = useState(false);
  const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const toggleMemberFromCleaning = async (
    memberId: string,
    currentlyExcluded: boolean
  ) => {
    if (loading) return;

    const currentExcluded = houseSettings.excluded_members?.["cleaning"] ?? [];
    const activeCount = members.length - currentExcluded.length;

    if (!currentlyExcluded && activeCount <= 1) {
      alert("At least 1 person must remain in the cleaning rotation.");
      return;
    }

    const newExcluded = currentlyExcluded
      ? currentExcluded.filter(id => id !== memberId)
      : [...currentExcluded, memberId];

    setLoading(true);
    try {
      const updatedSettings = {
        ...houseSettings,
        excluded_members: {
          ...houseSettings.excluded_members,
          cleaning: newExcluded,
        }
      };
      await houseService.saveHouseSettings(house.id, updatedSettings);
      onSettingsChange(updatedSettings);
    } catch (err) {
      console.error("Failed to update cleaning exclusions:", err);
    } finally { setLoading(false); }
  };

  const update = async (changes: Partial<HouseSettingsType>) => {
    if (loading) return;
    setLoading(true);
    try {
      const updated = { ...houseSettings, ...changes };
      await houseService.saveHouseSettings(house.id, updated);
      onSettingsChange(updated);
    } catch (err) {
      console.error("Failed to update cleaning settings:", err);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Toggle */}
      <div className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between">
        <div>
          <p className="font-bold text-sm text-foreground">Cleaning Rotation</p>
          <p className="text-xs text-muted-foreground mt-0.5">Track who cleans and when</p>
        </div>
        <button
          onClick={() => update({ cleaning_enabled: !houseSettings.cleaning_enabled })}
          disabled={loading}
          className={`w-12 h-6 rounded-full transition-all duration-300 relative ${houseSettings.cleaning_enabled ? "bg-primary" : "bg-muted border border-border"}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${houseSettings.cleaning_enabled ? "left-6" : "left-0.5"}`} />
        </button>
      </div>

      {houseSettings.cleaning_enabled && (
        <>
          {/* Frequency */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">How often?</p>
            <div className="flex gap-2">
              {[
                { v: "weekly",   l: "Weekly"       },
                { v: "biweekly", l: "Every 2 weeks" },
                { v: "monthly",  l: "Monthly"       },
              ].map(opt => (
                <button key={opt.v}
                  onClick={() => update({ cleaning_frequency: opt.v as any })}
                  disabled={loading}
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
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Which day?</p>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map((d, i) => (
                <button key={i}
                  onClick={() => update({ cleaning_day: i })}
                  disabled={loading}
                  className={`py-2.5 rounded-xl font-bold text-xs border-2 transition-all active:scale-95
                    ${houseSettings.cleaning_day === i
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
              Who participates in cleaning?
            </p>
            <div className="flex flex-col gap-0 rounded-2xl bg-card border border-border overflow-hidden">
              {members.map((m, idx) => {
                const excluded = (houseSettings.excluded_members?.["cleaning"] ?? []).includes(m.id);
                return (
                  <div key={m.id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${idx < members.length - 1 ? "border-b border-border/60" : ""}`}>
                    <Avatar name={m.name} size={34} radius={10} fontSize={13} />
                    <span className={`flex-1 font-semibold text-sm ${excluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {m.name}
                    </span>
                    {excluded && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-2">
                        Excluded
                      </span>
                    )}
                    <button
                      onClick={() => toggleMemberFromCleaning(m.id, excluded)}
                      disabled={loading}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${!excluded ? "bg-primary" : "bg-muted border border-border"}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${!excluded ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ At least 1 person must remain in the cleaning rotation.
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
  onSettingsChange,
}: {
  house:                  House;
  members:                Member[];
  houseSettings:          HouseSettingsType;
  cleaningRotationOrder:  string[];
  suppliesRotationOrder:  string[];
  onCleaningOrderChange:  (order: string[]) => void;
  onSuppliesOrderChange:  (order: string[]) => void;
  onSettingsChange:       (s: HouseSettingsType) => void;
}) => {
  const [loading, setLoading] = useState(false);

  const moveItem = (arr: string[], idx: number, dir: "up"|"down") => {
    const newArr   = [...arr];
    const swapIdx  = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newArr.length) return newArr;
    [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
    return newArr;
  };

  const saveCleaningOrder = async (newOrder: string[]) => {
    setLoading(true);
    try {
      const updated = { ...houseSettings, cleaning_rotation_order: newOrder };
      await houseService.saveHouseSettings(house.id, updated);
      onCleaningOrderChange(newOrder);
      onSettingsChange(updated);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveSuppliesOrder = async (newOrder: string[]) => {
    setLoading(true);
    try {
      const updated = { ...houseSettings, supplies_rotation_order: newOrder };
      await houseService.saveHouseSettings(house.id, updated);
      onSuppliesOrderChange(newOrder);
      onSettingsChange(updated);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const renderList = (
    title:   string,
    order:   string[],
    onSave:  (o: string[]) => Promise<void>
  ) => (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
      {order.map((id, idx) => {
        const member = members.find(m => m.id === id);
        if (!member) return null;
        return (
          <div key={id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
            <span className="w-6 text-center font-black text-primary text-sm shrink-0">{idx + 1}</span>
            <Avatar name={member.name} size={36} radius={10} fontSize={14} />
            <span className="flex-1 font-semibold text-sm text-foreground">{member.name}</span>
            <div className="flex gap-1">
              <button
                disabled={idx === 0 || loading}
                onClick={() => onSave(moveItem(order, idx, "up"))}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/80 transition-all active:scale-90 font-bold text-xs">
                ▲
              </button>
              <button
                disabled={idx === order.length - 1 || loading}
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
      {houseSettings.cleaning_enabled && renderList("🧹 Cleaning Order", cleaningRotationOrder, saveCleaningOrder)}
      {renderList("🛒 Supplies Order", suppliesRotationOrder, saveSuppliesOrder)}
    </div>
  );
};

export default HouseSettingsScreen;



