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
          tournament_id: string | null
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
          tournament_id?: string | null
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
          tournament_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brackets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "brackets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["category_id"]
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
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
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
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "brackets_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brackets_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
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
          tournament_id: string | null
        }
        Insert: {
          created_at?: string
          division_id: string
          id?: string
          name: string
          playoff_format?: string | null
          rr_rounds?: number
          sort_order?: number
          tournament_id?: string | null
        }
        Update: {
          created_at?: string
          division_id?: string
          id?: string
          name?: string
          playoff_format?: string | null
          rr_rounds?: number
          sort_order?: number
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      category_awards: {
        Row: {
          award_type: string
          category_id: string
          created_at: string
          id: string
          notes: string | null
          player_id: string | null
          tournament_id: string | null
        }
        Insert: {
          award_type: string
          category_id: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string | null
          tournament_id?: string | null
        }
        Update: {
          award_type?: string
          category_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_awards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_awards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_awards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "category_awards_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          tournament_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divisions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      fair_play_aggregate: {
        Row: {
          category_id: string
          id: string
          team_id: string
          total_penalties: number
          total_penalty_minutes: number
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          id?: string
          team_id: string
          total_penalties?: number
          total_penalty_minutes?: number
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          id?: string
          team_id?: string
          total_penalties?: number
          total_penalty_minutes?: number
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fair_play_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "fair_play_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fair_play_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "fair_play_aggregate_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "fair_play_aggregate_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fair_play_aggregate_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          tournament_id: string | null
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
          tournament_id?: string | null
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
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_events_assist_player_id_fkey"
            columns: ["assist_player_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["player_id"]
          },
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
            referencedRelation: "mvp_by_category"
            referencedColumns: ["player_id"]
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
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "goal_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
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
          tournament_id: string | null
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
          tournament_id?: string | null
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
          tournament_id?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          penalty_time: string | null
          period: number
          player_id: string | null
          team_id: string
          tournament_id: string | null
        }
        Insert: {
          created_at?: string
          game_time?: string | null
          id?: string
          match_id: string
          penalty_code: string
          penalty_description: string
          penalty_minutes?: number
          penalty_time?: string | null
          period: number
          player_id?: string | null
          team_id: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string
          game_time?: string | null
          id?: string
          match_id?: string
          penalty_code?: string
          penalty_description?: string
          penalty_minutes?: number
          penalty_time?: string | null
          period?: number
          player_id?: string | null
          team_id?: string
          tournament_id?: string | null
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
            referencedRelation: "mvp_by_category"
            referencedColumns: ["player_id"]
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
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "penalties_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          tournament_id: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          id?: string
          jersey_number?: number | null
          last_name: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          id?: string
          jersey_number?: number | null
          last_name?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
          tournament_id: string | null
        }
        Insert: {
          category_id: string
          seed: number
          team_id?: string | null
          tournament_id?: string | null
        }
        Update: {
          category_id?: string
          seed?: number
          team_id?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playoff_slots_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
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
          tournament_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_id: string
          position?: string | null
          season?: string
          team_id: string
          tournament_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: number | null
          player_id?: string
          position?: string | null
          season?: string
          team_id?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rosters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["player_id"]
          },
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
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "rosters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          tournament_id: string | null
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
          tournament_id?: string | null
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
          tournament_id?: string | null
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "standings_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_aggregate_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "standings_aggregate_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "standings_aggregate_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_aggregate_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
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
          tournament_id: string | null
        }
        Insert: {
          category_id: string
          club_id: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          tournament_id?: string | null
        }
        Update: {
          category_id?: string
          club_id?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "best_defense_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "mvp_by_category"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          bg_color: string | null
          created_at: string
          font_family: string | null
          font_size: string | null
          footer_color: string | null
          header_color: string | null
          id: string
          name: string
          primary_color: string | null
          season: string | null
          semester: string | null
          status: string
          text_color: string | null
          title_color: string | null
          year: number | null
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          font_family?: string | null
          font_size?: string | null
          footer_color?: string | null
          header_color?: string | null
          id?: string
          name: string
          primary_color?: string | null
          season?: string | null
          semester?: string | null
          status?: string
          text_color?: string | null
          title_color?: string | null
          year?: number | null
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          font_family?: string | null
          font_size?: string | null
          footer_color?: string | null
          header_color?: string | null
          id?: string
          name?: string
          primary_color?: string | null
          season?: string | null
          semester?: string | null
          status?: string
          text_color?: string | null
          title_color?: string | null
          year?: number | null
        }
        Relationships: []
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
      best_defense_by_category: {
        Row: {
          category_id: string | null
          category_name: string | null
          goals_against: number | null
          played: number | null
          rank_in_category: number | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: []
      }
      mvp_by_category: {
        Row: {
          assists: number | null
          category_id: string | null
          category_name: string | null
          goals: number | null
          jersey_number: number | null
          player_id: string | null
          player_name: string | null
          rank_in_category: number | null
          team_name: string | null
          total_contributions: number | null
        }
        Relationships: []
      }
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
      _resolve_bracket_slot: {
        Args: {
          p_category_id: string
          p_division_id: string
          p_match_id: string
          p_side: string
          p_token: string
        }
        Returns: undefined
      }
      delete_match_and_recalc: {
        Args: { p_match_id: string }
        Returns: undefined
      }
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
      recalc_fair_play_for_category: {
        Args: { p_category_id: string }
        Returns: undefined
      }
      recalc_player_stats: { Args: never; Returns: undefined }
      recalc_standings_for_category: {
        Args: { p_category_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "editor"
      extra_time_type: "none" | "ot" | "so"
      match_phase:
        | "regular"
        | "playoff"
        | "final"
        | "third_place"
        | "ranking"
        | "semifinal"
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
      match_phase: [
        "regular",
        "playoff",
        "final",
        "third_place",
        "ranking",
        "semifinal",
      ],
      match_status: ["scheduled", "in_progress", "closed", "locked"],
    },
  },
} as const
