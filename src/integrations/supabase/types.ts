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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bangladesh_laws: {
        Row: {
          act_number: string | null
          amendments: string | null
          chapter: string | null
          created_at: string | null
          id: string
          last_updated: string | null
          law_title: string
          law_title_bn: string | null
          section_content: string
          section_content_bn: string | null
          section_number: string | null
          section_title: string | null
          source_url: string | null
          status: string | null
          year: number | null
        }
        Insert: {
          act_number?: string | null
          amendments?: string | null
          chapter?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          law_title: string
          law_title_bn?: string | null
          section_content: string
          section_content_bn?: string | null
          section_number?: string | null
          section_title?: string | null
          source_url?: string | null
          status?: string | null
          year?: number | null
        }
        Update: {
          act_number?: string | null
          amendments?: string | null
          chapter?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          law_title?: string
          law_title_bn?: string | null
          section_content?: string
          section_content_bn?: string | null
          section_number?: string | null
          section_title?: string | null
          source_url?: string | null
          status?: string | null
          year?: number | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          case_law_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string
          message_id: string | null
          notes: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          case_law_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          notes?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          case_law_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          notes?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_case_law_id_fkey"
            columns: ["case_law_id"]
            isOneToOne: false
            referencedRelation: "case_laws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "legal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      case_laws: {
        Row: {
          act_name: string
          case_title: string
          case_title_bn: string | null
          citation: string | null
          created_at: string | null
          full_text: string | null
          id: string
          jurisdiction: string | null
          keywords: string[] | null
          section_number: string | null
          updated_at: string | null
          verdict_summary: string | null
          verdict_summary_bn: string | null
          year: number | null
        }
        Insert: {
          act_name: string
          case_title: string
          case_title_bn?: string | null
          citation?: string | null
          created_at?: string | null
          full_text?: string | null
          id?: string
          jurisdiction?: string | null
          keywords?: string[] | null
          section_number?: string | null
          updated_at?: string | null
          verdict_summary?: string | null
          verdict_summary_bn?: string | null
          year?: number | null
        }
        Update: {
          act_name?: string
          case_title?: string
          case_title_bn?: string | null
          citation?: string | null
          created_at?: string | null
          full_text?: string | null
          id?: string
          jurisdiction?: string | null
          keywords?: string[] | null
          section_number?: string | null
          updated_at?: string | null
          verdict_summary?: string | null
          verdict_summary_bn?: string | null
          year?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          language: Database["public"]["Enums"]["language_preference"] | null
          personality_mode:
            | Database["public"]["Enums"]["personality_mode"]
            | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_preference"] | null
          personality_mode?:
            | Database["public"]["Enums"]["personality_mode"]
            | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_preference"] | null
          personality_mode?:
            | Database["public"]["Enums"]["personality_mode"]
            | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          analysis_result: Json | null
          conversation_id: string | null
          created_at: string | null
          extracted_text: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          language: string | null
          ocr_text: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          language?: string | null
          ocr_text?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          language?: string | null
          ocr_text?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      law_source_sync_log: {
        Row: {
          error_message: string | null
          id: string
          status: string | null
          sync_completed_at: string | null
          sync_started_at: string | null
          synced_by: string | null
          total_laws_synced: number | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string | null
          synced_by?: string | null
          total_laws_synced?: number | null
        }
        Update: {
          error_message?: string | null
          id?: string
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string | null
          synced_by?: string | null
          total_laws_synced?: number | null
        }
        Relationships: []
      }
      legal_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_public: boolean | null
          tags: string[] | null
          template_content: string
          template_name: string
          template_name_bn: string | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          template_content: string
          template_name: string
          template_name_bn?: string | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          template_content?: string
          template_name?: string
          template_name_bn?: string | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          sources: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          sources?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          personality_mode: string | null
          phone: string | null
          preferred_language:
            | Database["public"]["Enums"]["language_preference"]
            | null
          preferred_personality:
            | Database["public"]["Enums"]["personality_mode"]
            | null
          profession: string | null
          response_mode: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          personality_mode?: string | null
          phone?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          preferred_personality?:
            | Database["public"]["Enums"]["personality_mode"]
            | null
          profession?: string | null
          response_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          personality_mode?: string | null
          phone?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          preferred_personality?:
            | Database["public"]["Enums"]["personality_mode"]
            | null
          profession?: string | null
          response_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
      language_preference: "bangla" | "english" | "mixed"
      personality_mode: "lawyer" | "judge" | "researcher" | "student"
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
      app_role: ["user", "admin"],
      language_preference: ["bangla", "english", "mixed"],
      personality_mode: ["lawyer", "judge", "researcher", "student"],
    },
  },
} as const
