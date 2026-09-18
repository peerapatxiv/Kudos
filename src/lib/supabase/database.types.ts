/**
 * Hand-authored to mirror supabase/migrations/0001_init.sql. If the schema
 * changes, regenerate with:
 *   supabase gen types typescript --local > src/lib/supabase/database.types.ts
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          height_cm: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      races: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          race_type: string;
          date: string;
          distance_km: number;
          goal_time_seconds: number | null;
          goal_pace_seconds_per_km: number | null;
          priority: "a_race" | "secondary" | "tune_up";
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["races"]["Row"]> & {
          user_id: string;
          name: string;
          race_type: string;
          date: string;
          distance_km: number;
          priority: "a_race" | "secondary" | "tune_up";
        };
        Update: Partial<Database["public"]["Tables"]["races"]["Row"]>;
        Relationships: [];
      };
      training_weeks: {
        Row: {
          id: string;
          user_id: string;
          week_number: number;
          phase: string;
          start_date: string;
          end_date: string;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["training_weeks"]["Row"]> & {
          user_id: string;
          week_number: number;
          phase: string;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_weeks"]["Row"]>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          training_week_id: string | null;
          date: string;
          day_of_week: string;
          title: string;
          workout_type: string;
          distance_km: number | null;
          target_pace_min_sec_per_km: string | null;
          pace_min_sec_per_km: number | null;
          notes: string | null;
          is_rest_day: boolean;
          is_race: boolean;
          race_id: string | null;
          completed: boolean;
          status: string;
          completed_at: string | null;
          actual_distance_km: number | null;
          actual_time_seconds: number | null;
          actual_pace_seconds_per_km: number | null;
          perceived_effort: number | null;
          athlete_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["workouts"]["Row"]> & {
          user_id: string;
          date: string;
          day_of_week: string;
          title: string;
          workout_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "workouts_race_id_fkey";
            columns: ["race_id"];
            isOneToOne: false;
            referencedRelation: "races";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_training_week_id_fkey";
            columns: ["training_week_id"];
            isOneToOne: false;
            referencedRelation: "training_weeks";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_intervals: {
        Row: {
          id: string;
          workout_id: string;
          interval_number: number;
          distance_m: number;
          target_pace_seconds_per_km: number | null;
          recovery_seconds: number | null;
          recovery_type: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["workout_intervals"]["Row"]> & {
          workout_id: string;
          interval_number: number;
          distance_m: number;
        };
        Update: Partial<Database["public"]["Tables"]["workout_intervals"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "workout_intervals_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          sleep_quality: number | null;
          fatigue: number | null;
          soreness: number | null;
          motivation: number | null;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["daily_logs"]["Row"]> & {
          user_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["daily_logs"]["Row"]>;
        Relationships: [];
      };
      body_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight_kg: number | null;
          resting_hr: number | null;
          vo2max: number | null;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["body_metrics"]["Row"]> & {
          user_id: string;
          date: string;
        };
        Update: Partial<Database["public"]["Tables"]["body_metrics"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
