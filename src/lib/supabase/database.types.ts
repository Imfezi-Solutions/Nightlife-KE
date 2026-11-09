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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      age_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          provider_reference: string | null
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          provider_reference?: string | null
          status: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          provider_reference?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          author_id: string
          body: string
          club_id: string
          created_at: string
          id: string
          room_id: string
        }
        Insert: {
          author_id: string
          body: string
          club_id: string
          created_at?: string
          id?: string
          room_id: string
        }
        Update: {
          author_id?: string
          body?: string
          club_id?: string
          created_at?: string
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_club_fkey"
            columns: ["room_id", "club_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id", "club_id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_reports: {
        Row: {
          club_id: string
          created_at: string
          details: string | null
          id: string
          message_id: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          club_id: string
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_reports_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          capacity: number
          county_id: number
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code_hash: string | null
          name: string
          slug: string
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          capacity?: number
          county_id: number
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code_hash?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          capacity?: number
          county_id?: number
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code_hash?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id?: never
          name: string
          slug: string
        }
        Update: {
          id?: never
          name?: string
          slug?: string
        }
        Relationships: []
      }
      dj_queue: {
        Row: {
          added_by: string
          artist: string | null
          created_at: string
          duration_ms: number
          id: string
          position: number
          provider_asset_id: string
          rights_reference: string
          rights_status: string
          room_id: string
          source_type: string
          title: string
        }
        Insert: {
          added_by: string
          artist?: string | null
          created_at?: string
          duration_ms: number
          id?: string
          position?: number
          provider_asset_id: string
          rights_reference: string
          rights_status?: string
          room_id: string
          source_type: string
          title: string
        }
        Update: {
          added_by?: string
          artist?: string | null
          created_at?: string
          duration_ms?: number
          id?: string
          position?: number
          provider_asset_id?: string
          rights_reference?: string
          rights_status?: string
          room_id?: string
          source_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dj_queue_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      dj_sessions: {
        Row: {
          current_track_id: string | null
          playback_status: string
          position_ms: number
          room_id: string
          started_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          current_track_id?: string | null
          playback_status?: string
          position_ms?: number
          room_id: string
          started_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          current_track_id?: string | null
          playback_status?: string
          position_ms?: number
          room_id?: string
          started_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dj_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_djs: {
        Row: {
          granted_at: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          granted_at?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          granted_at?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          county_id: number | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          county_id?: number | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          county_id?: number | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          club_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          room_type: string
        }
        Insert: {
          capacity?: number
          club_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          room_type: string
        }
        Update: {
          capacity?: number
          club_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          room_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_club: {
        Args: {
          p_capacity?: number
          p_county_id: number
          p_description?: string
          p_name: string
          p_visibility?: string
        }
        Returns: Json
      }
      join_club: {
        Args: { p_club_id: string; p_invitation_code?: string }
        Returns: Json
      }
      preview_invite_club: {
        Args: { p_club_id: string; p_invitation_code: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
