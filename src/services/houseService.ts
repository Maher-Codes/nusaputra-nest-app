import { supabase } from "@/integrations/supabase/client";
import { genCode } from "@/lib/househub";

export const houseService = {
  /**
   * Generates a 6-digit house code and ensures it's unique in the database.
   */
  async generateUniqueHouseCode(): Promise<string> {
    let code = "";
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = genCode();
      console.log(`Checking uniqueness for code: ${code} (Attempt ${attempts + 1})`);
      const { data, error } = await supabase
        .from("houses")
        .select("house_code")
        .eq("house_code", code)
        .maybeSingle();

      if (error) {
        console.error("Error checking house code uniqueness:", error);
        throw new Error("Failed to verify house code uniqueness");
      }

      if (!data) {
        console.log(`Code ${code} is unique!`);
        isUnique = true;
      } else {
        console.log(`Code ${code} already exists.`);
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error("Failed to generate a unique house code after multiple attempts");
    }

    return code;
  },

  /**
   * Inserts a new house into the database.
   */
  async createHouse(name: string, code: string) {
    console.log("Creating house with name:", name, "and code:", code);
    const { data, error } = await supabase
      .from("houses")
      .insert({
        name: name.trim(),
        house_code: code,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating house in Supabase:", error);
      throw error;
    }

    console.log("Supabase insert response:", data);
    return data;
  },
};
