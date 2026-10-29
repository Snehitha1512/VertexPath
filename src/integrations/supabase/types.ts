export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          current_status: string | null
          education_level: string | null
          education_detail: string | null
          college_or_company: string | null
          gender: string | null
          dob: string | null
          target_job: string | null
          experience_years: string | null
          industry: string | null
          skills: string | null
          location: string | null
          availability: string | null
          salary_expectation: string | null
          bio: string | null
          phone: string | null
          linkedin_url: string | null
          github_url: string | null
          portfolio_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          current_status?: string | null
          education_level?: string | null
          education_detail?: string | null
          college_or_company?: string | null
          gender?: string | null
          dob?: string | null
          target_job?: string | null
          experience_years?: string | null
          industry?: string | null
          skills?: string | null
          location?: string | null
          availability?: string | null
          salary_expectation?: string | null
          bio?: string | null
          phone?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          current_status?: string | null
          education_level?: string | null
          education_detail?: string | null
          college_or_company?: string | null
          gender?: string | null
          dob?: string | null
          target_job?: string | null
          experience_years?: string | null
          industry?: string | null
          skills?: string | null
          location?: string | null
          availability?: string | null
          salary_expectation?: string | null
          bio?: string | null
          phone?: string | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          title: string
          platform: string | null
          url: string | null
          difficulty: string | null
          duration_hours: number | null
          is_free: boolean | null
          skill_tags: string[] | null
        }
        Insert: {
          id?: string
          title: string
          platform?: string | null
          url?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          is_free?: boolean | null
          skill_tags?: string[] | null
        }
        Update: {
          id?: string
          title?: string
          platform?: string | null
          url?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          is_free?: boolean | null
          skill_tags?: string[] | null
        }
        Relationships: []
      }
      roadmap_entries: {
        Row: {
          id: string
          user_id: string | null
          title: string | null
          description: string | null
          skill_tag: string | null
          status: string | null
          start_date: string | null
          end_date: string | null
          evidence_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title?: string | null
          description?: string | null
          skill_tag?: string | null
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          evidence_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string | null
          description?: string | null
          skill_tag?: string | null
          status?: string | null
          start_date?: string | null
          end_date?: string | null
          evidence_url?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_courses: {
        Row: {
          id: string
          user_id: string | null
          course_id: string | null
          status: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          status?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          course_id?: string | null
          status?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          technologies: string[]
          project_url: string | null
          start_date: string | null
          end_date: string | null
          source_type: string
          source_ref: string | null
          source_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          technologies?: string[]
          project_url?: string | null
          start_date?: string | null
          end_date?: string | null
          source_type?: string
          source_ref?: string | null
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          technologies?: string[]
          project_url?: string | null
          start_date?: string | null
          end_date?: string | null
          source_type?: string
          source_ref?: string | null
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      certifications: {
        Row: {
          id: string
          user_id: string
          name: string
          issuer: string | null
          issue_date: string | null
          expiry_date: string | null
          credential_url: string | null
          skills: string[]
          source_type: string
          source_ref: string | null
          verification_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          issuer?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          credential_url?: string | null
          skills?: string[]
          source_type?: string
          source_ref?: string | null
          verification_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          issuer?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          credential_url?: string | null
          skills?: string[]
          source_type?: string
          source_ref?: string | null
          verification_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_candidates: {
        Row: {
          id: string
          user_id: string
          kind: string
          source: string
          source_ref: string | null
          payload: Json
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          source: string
          source_ref?: string | null
          payload: Json
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          source?: string
          source_ref?: string | null
          payload?: Json
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      career_sources: {
        Row: {
          id: string
          user_id: string
          source_type: string
          handle: string
          last_synced_at: string | null
          last_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_type: string
          handle: string
          last_synced_at?: string | null
          last_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_type?: string
          handle?: string
          last_synced_at?: string | null
          last_status?: string | null
          created_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          name: string
          target_role: string | null
          job_description: string | null
          content: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          target_role?: string | null
          job_description?: string | null
          content?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          target_role?: string | null
          job_description?: string | null
          content?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
