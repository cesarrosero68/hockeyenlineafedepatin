export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      brackets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          match_id: string | null
          next_bracket_id: string | null
          placement: number | null
          position: number
          round_name: string
          team_a_id: string | null
          team_b_id: string | null
          winner_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          match_id?: string | null
          next_bracket_id?: string | null
          placement?: number | null
          position?: number
          round_name: string
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          match_id?: string | null
          next_bracket_id?: string | null
          placement?: number | null
          position?: number
          round_name?: string
          team_a_id?: string | null
          team_b_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brackets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_next_bracket_id_fkey"
            columns: ["next_bracket_id"]
            isOneToOne: false
            referencedRelation: "brackets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          division_id: string
          id: string
          name: string
          playoff_format: string | null
          rr_rounds: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          division_id: string
          id?: string
          name: string
          playoff_format?: string | null
          rr_rounds?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          division_id?: string
          id?: string
          name?: string
          playoff_format?: string | null
          rr_rounds?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      divisions: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      fair_play_aggregate: {
        Row: {
          category_id: string
          id: string
          team_id: string
          total_penalties: number
          total_penalty_minutes: number
          updated_at: string
        }
        Insert: {
          category_id: string
          id?: string
          team_id: string
          total_penalties?: number
          total_penalty_minutes?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          id?: string
          team_id?: string
          total_penalties?: number
          total_penalty_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fair_play_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fair_play_aggregate_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_events: {
        Row: {
          assist_player_id: string | null
          created_at: string
          game_time: string | null
          id: string
          is_overtime: boolean
          is_shootout: boolean
          match_id: string
          period: number
          scorer_player_id: string
          team_id: string
        }
        Insert: {
          assist_player_id?: string | null
          created_at?: string
          game_time?: string | null
          id?: string
          is_overtime?: boolean
          is_shootout?: boolean
          match_id: string
          period: number
          scorer_player_id: string
          team_id: string
        }
        Update: {
          assist_player_id?: string | null
          created_at?: string
          game_time?: string | null
          id?: string
          is_overtime?: boolean
          is_shootout?: boolean
          match_id?: string
          period?: number
          scorer_player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_scorer_player_id_fkey"
            columns: ["scorer_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_scorer_player_id_fkey"
            columns: ["scorer_player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_import: {
        Row: {
          away_team: string | null
          categoria: string
          division: string
          home_team: string | null
          match_code: string
        }
        Insert: {
          away_team?: string | null
          categoria: string
          division: string
          home_team?: string | null
          match_code: string
        }
        Update: {
          away_team?: string | null
          categoria?: string
          division?: string
          home_team?: string | null
          match_code?: string
        }
        Relationships: []
      }
      match_teams: {
        Row: {
          id: string
          is_forfeit: boolean | null
          is_winner: boolean | null
          match_id: string
          score_extra: number | null
          score_regular: number
          side: string
          team_id: string
        }
        Insert: {
          id?: string
          is_forfeit?: boolean | null
          is_winner?: boolean | null
          match_id: string
          score_extra?: number | null
          score_regular?: number
          side: string
          team_id: string
        }
        Update: {
          id?: string
          is_forfeit?: boolean | null
          is_winner?: boolean | null
          match_id?: string
          score_extra?: number | null
          score_regular?: number
          side?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_teams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string
          created_at: string
          extra_time: Database["public"]["Enums"]["extra_time_type"]
          id: string
          match_date: string | null
          notes: string | null
          phase: Database["public"]["Enums"]["match_phase"]
          round_number: number | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          extra_time?: Database["public"]["Enums"]["extra_time_type"]
          id?: string
          match_date?: string | null
          notes?: string | null
          phase?: Database["public"]["Enums"]["match_phase"]
          round_number?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          extra_time?: Database["public"]["Enums"]["extra_time_type"]
          id?: string
          match_date?: string | null
          notes?: string | null
          phase?: Database["public"]["Enums"]["match_phase"]
          round_number?: number | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      penalties: {
        Row: {
          created_at: string
          game_time: string | null
          id: string
          match_id: string
          penalty_code: string
          penalty_description: string
          penalty_minutes: number
          period: number
          player_id: string | null
          team_id: string
        }
        Insert: {
          created_at?: string
          game_time?: string | null
          id?: string
          match_id: string
          penalty_code: string
          penalty_description: string
          penalty_minutes?: number
          period: number
          player_id?: string | null
          team_id: string
        }
        Update: {
          created_at?: string
          game_time?: string | null
          id?: string
          match_id?: string
          penalty_code?: string
          penalty_description?: string
          penalty_minutes?: number
          period?: number
          player_id?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          date_of_birth: string | null
          first_name: string
          id: string
          jersey_number: number | null
          last_name: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          id?: string
          jersey_number?: number | null
          last_name: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          id?: string
          jersey_number?: number | null
          last_name?: string
        }
        Relationships: []
      }
      playoff_bracket: {
        Row: {
          category_id: string | null
          id: string
          round: string | null
          slot: number | null
          source_match_id: string | null
          team_id: string | null
        }
        Insert: {
          category_id?: string | null
          id?: string
          round?: string | null
          slot?: number | null
          source_match_id?: string | null
          team_id?: string | null
        }
        Update: {
          category_id?: string | null
          id?: string
          round?: string | null
          slot?: number | null
          source_match_id?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      playoff_slots: {
        Row: {
          category_id: string
          seed: number
          team_id: string | null
        }
        Insert: {
          category_id: string
          seed: number
          team_id?: string | null
        }
        Update: {
          category_id?: string
          seed?: number
          team_id?: string | null
        }
        Relationships: []
      }
      rosters: {
        Row: {
          created_at: string
          id: string
          jersey_number: number | null
          player_id: string
          position: string | null
          season: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_id: string
          position?: string | null
          season?: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_id?: string
          position?: string | null
          season?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      standings_aggregate: {
        Row: {
          category_id: string
          draws: number
          goal_diff: number
          goals_against: number
          goals_for: number
          id: string
          losses: number
          played: number
          points: number
          rank: number | null
          team_id: string
          updated_at: string
          wins: number
        }
        Insert: {
          category_id: string
          draws?: number
          goal_diff?: number
          goals_against?: number
          goals_for?: number
          id?: string
          losses?: number
          played?: number
          points?: number
          rank?: number | null
          team_id: string
          updated_at?: string
          wins?: number
        }
        Update: {
          category_id?: string
          draws?: number
          goal_diff?: number
          goals_against?: number
          goals_for?: number
          id?: string
          losses?: number
          played?: number
          points?: number
          rank?: number | null
          team_id?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_aggregate_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category_id: string
          club_id: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          category_id: string
          club_id: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          category_id?: string
          club_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      player_scoring_totals: {
        Row: {
          asistencias: number | null
          goles: number | null
          player_id: string | null
          puntos: number | null
        }
        Relationships: []
      }
      player_stats_aggregate: {
        Row: {
          asistencias: number | null
          goles: number | null
          player_id: string | null
          puntos: number | null
        }
        Relationships: []
      }
      player_stats_view: {
        Row: {
          asistencias: number | null
          goles: number | null
          player_id: string | null
          puntos: number | null
        }
        Relationships: []
      }
      players_public: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string | null
          jersey_number: number | null
          last_name: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          jersey_number?: number | null
          last_name?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          jersey_number?: number | null
          last_name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_playoffs: {
        Args: {
          p_category_name: string
          p_division_name: string
          p_interval_minutes?: number
          p_start_date: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_player_stats: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "editor"
      extra_time_type: "none" | "ot" | "so"
      match_phase: "regular" | "playoff" | "final" | "third_place" | "ranking"
      match_status: "scheduled" | "in_progress" | "closed" | "locked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor"],
      extra_time_type: ["none", "ot", "so"],
      match_phase: ["regular", "playoff", "final", "third_place", "ranking"],
      match_status: ["scheduled", "in_progress", "closed", "locked"],
    },
  },
} as const
