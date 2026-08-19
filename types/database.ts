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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_runs: {
        Row: {
          application_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_hash: string
          input_tokens: number | null
          model: string
          operation: Database["public"]["Enums"]["ai_operation"]
          output_tokens: number | null
          prompt_version: string
          provider: string
          result: Json | null
          status: Database["public"]["Enums"]["ai_run_status"]
          user_id: string
        }
        Insert: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_hash: string
          input_tokens?: number | null
          model: string
          operation: Database["public"]["Enums"]["ai_operation"]
          output_tokens?: number | null
          prompt_version: string
          provider: string
          result?: Json | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          user_id?: string
        }
        Update: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_hash?: string
          input_tokens?: number | null
          model?: string
          operation?: Database["public"]["Enums"]["ai_operation"]
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          result?: Json | null
          status?: Database["public"]["Enums"]["ai_run_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_application_owner_fkey"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "ai_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_channels: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_channels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          meeting_url: string | null
          notes: string | null
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["application_event_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          starts_at: string
          title: string
          type: Database["public"]["Enums"]["application_event_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          meeting_url?: string | null
          notes?: string | null
          starts_at?: string
          title?: string
          type?: Database["public"]["Enums"]["application_event_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_owner_fkey"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "application_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          body: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_owner_fkey"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "application_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_stage_events: {
        Row: {
          application_id: string
          created_at: string
          from_stage_id: string | null
          id: string
          notes: string | null
          occurred_at: string
          to_stage_id: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          to_stage_id: string
          user_id?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          to_stage_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_stage_events_application_owner_fkey"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "application_stage_events_from_stage_owner_fkey"
            columns: ["from_stage_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "application_stage_events_to_stage_owner_fkey"
            columns: ["to_stage_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "application_stage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          ai_extracted_data: Json | null
          ai_summary: string | null
          application_channel_id: string
          applied_at: string | null
          archived_at: string | null
          company_id: string
          created_at: string
          current_stage_id: string
          discovery_source_id: string
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          id: string
          job_title: string
          job_url: string | null
          location: string | null
          notes: string | null
          raw_job_description: string
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: Database["public"]["Enums"]["salary_period"] | null
          seniority: string | null
          submitted_resume_id: string | null
          updated_at: string
          user_id: string
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        Insert: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          application_channel_id: string
          applied_at?: string | null
          archived_at?: string | null
          company_id: string
          created_at?: string
          current_stage_id: string
          discovery_source_id: string
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          id?: string
          job_title: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          raw_job_description?: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"] | null
          seniority?: string | null
          submitted_resume_id?: string | null
          updated_at?: string
          user_id?: string
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Update: {
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          application_channel_id?: string
          applied_at?: string | null
          archived_at?: string | null
          company_id?: string
          created_at?: string
          current_stage_id?: string
          discovery_source_id?: string
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          id?: string
          job_title?: string
          job_url?: string | null
          location?: string | null
          notes?: string | null
          raw_job_description?: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"] | null
          seniority?: string | null
          submitted_resume_id?: string | null
          updated_at?: string
          user_id?: string
          work_mode?: Database["public"]["Enums"]["work_mode"] | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_channel_owner_fkey"
            columns: ["application_channel_id", "user_id"]
            isOneToOne: false
            referencedRelation: "application_channels"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_company_owner_fkey"
            columns: ["company_id", "user_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_current_stage_owner_fkey"
            columns: ["current_stage_id", "user_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_discovery_source_owner_fkey"
            columns: ["discovery_source_id", "user_id"]
            isOneToOne: false
            referencedRelation: "application_sources"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_submitted_resume_owner_fkey"
            columns: ["submitted_resume_id", "user_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          location: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          application_id: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          application_id?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_application_owner_fkey"
            columns: ["application_id", "user_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "contacts_company_owner_fkey"
            columns: ["company_id", "user_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          category: Database["public"]["Enums"]["pipeline_stage_category"]
          created_at: string
          id: string
          is_active: boolean
          is_terminal: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["pipeline_stage_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          name: string
          sort_order: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["pipeline_stage_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          is_terminal?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          no_response_days: number
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          no_response_days?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          no_response_days?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          archived_at: string | null
          created_at: string
          extracted_text: string | null
          file_hash: string | null
          file_size_bytes: number
          id: string
          mime_type: string
          name: string
          original_filename: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          extracted_text?: string | null
          file_hash?: string | null
          file_size_bytes: number
          id?: string
          mime_type: string
          name: string
          original_filename: string
          storage_path: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          extracted_text?: string | null
          file_hash?: string | null
          file_size_bytes?: number
          id?: string
          mime_type?: string
          name?: string
          original_filename?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_ai_run: {
        Args: {
          p_application_id: string
          p_input_hash: string
          p_model: string
          p_operation: Database["public"]["Enums"]["ai_operation"]
          p_prompt_version: string
          p_provider: string
          p_server_capability: string
        }
        Returns: {
          application_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_hash: string
          input_tokens: number | null
          model: string
          operation: Database["public"]["Enums"]["ai_operation"]
          output_tokens: number | null
          prompt_version: string
          provider: string
          result: Json | null
          status: Database["public"]["Enums"]["ai_run_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_resume_upload: {
        Args: { p_resume_id: string; p_storage_path: string }
        Returns: boolean
      }
      complete_ai_run: {
        Args: {
          p_ai_run_id: string
          p_error_message?: string
          p_input_tokens?: number
          p_output_tokens?: number
          p_result?: Json
          p_server_capability: string
          p_status: Database["public"]["Enums"]["ai_run_status"]
        }
        Returns: {
          application_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_hash: string
          input_tokens: number | null
          model: string
          operation: Database["public"]["Enums"]["ai_operation"]
          output_tokens: number | null
          prompt_version: string
          provider: string
          result: Json | null
          status: Database["public"]["Enums"]["ai_run_status"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_runs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_resume_upload: {
        Args: {
          p_extracted_text?: string
          p_file_hash: string
          p_file_size_bytes: number
          p_mime_type: string
          p_name: string
          p_original_filename: string
          p_resume_id: string
          p_storage_path: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          extracted_text: string | null
          file_hash: string | null
          file_size_bytes: number
          id: string
          mime_type: string
          name: string
          original_filename: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "resumes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_resume_upload: {
        Args: {
          p_expected_bytes: number
          p_mime_type: string
          p_resume_id: string
          p_storage_path: string
        }
        Returns: string
      }
      restore_resume_metadata_after_failed_delete: {
        Args: {
          p_archived_at: string
          p_created_at: string
          p_extracted_text: string
          p_file_hash: string
          p_file_size_bytes: number
          p_mime_type: string
          p_name: string
          p_original_filename: string
          p_resume_id: string
          p_storage_path: string
          p_updated_at: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          extracted_text: string | null
          file_hash: string | null
          file_size_bytes: number
          id: string
          mime_type: string
          name: string
          original_filename: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "resumes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_application_stage: {
        Args: {
          p_application_id: string
          p_notes?: string
          p_occurred_at?: string
          p_to_stage_id: string
        }
        Returns: {
          ai_extracted_data: Json | null
          ai_summary: string | null
          application_channel_id: string
          applied_at: string | null
          archived_at: string | null
          company_id: string
          created_at: string
          current_stage_id: string
          discovery_source_id: string
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          id: string
          job_title: string
          job_url: string | null
          location: string | null
          notes: string | null
          raw_job_description: string
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: Database["public"]["Enums"]["salary_period"] | null
          seniority: string | null
          submitted_resume_id: string | null
          updated_at: string
          user_id: string
          work_mode: Database["public"]["Enums"]["work_mode"] | null
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      ai_operation:
        | "job_extraction"
        | "resume_comparison"
        | "interview_prep_jd"
        | "interview_prep_jd_resume"
      ai_run_status: "pending" | "succeeded" | "failed"
      application_event_type:
        | "recruiter_call"
        | "screening"
        | "technical_interview"
        | "behavioral_interview"
        | "system_design"
        | "technical_assessment"
        | "final_interview"
        | "follow_up"
        | "other"
      employment_type:
        | "full-time"
        | "part-time"
        | "contract"
        | "internship"
        | "temporary"
        | "unknown"
      pipeline_stage_category:
        | "saved"
        | "applied"
        | "screening"
        | "assessment"
        | "interview"
        | "offer"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "ghosted"
        | "closed"
      salary_period: "hour" | "day" | "month" | "year"
      work_mode: "remote" | "hybrid" | "onsite" | "unknown"
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
      ai_operation: [
        "job_extraction",
        "resume_comparison",
        "interview_prep_jd",
        "interview_prep_jd_resume",
      ],
      ai_run_status: ["pending", "succeeded", "failed"],
      application_event_type: [
        "recruiter_call",
        "screening",
        "technical_interview",
        "behavioral_interview",
        "system_design",
        "technical_assessment",
        "final_interview",
        "follow_up",
        "other",
      ],
      employment_type: [
        "full-time",
        "part-time",
        "contract",
        "internship",
        "temporary",
        "unknown",
      ],
      pipeline_stage_category: [
        "saved",
        "applied",
        "screening",
        "assessment",
        "interview",
        "offer",
        "accepted",
        "rejected",
        "withdrawn",
        "ghosted",
        "closed",
      ],
      salary_period: ["hour", "day", "month", "year"],
      work_mode: ["remote", "hybrid", "onsite", "unknown"],
    },
  },
} as const
