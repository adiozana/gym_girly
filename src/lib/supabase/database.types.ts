
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "challenges": {
                  Row: {
                    "ended_at": string | null,"id": string,"start_date": string,"status": Database["public"]['Enums']["challenge_status"],"user_id": string,"weeks": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_at"?: string | null,"id"?: string,"start_date": string,"status"?: Database["public"]['Enums']["challenge_status"],"user_id": string,"weeks": number
                  }
                  Update: {
                    "ended_at"?: string | null,"id"?: string,"start_date"?: string,"status"?: Database["public"]['Enums']["challenge_status"],"user_id"?: string,"weeks"?: number
                  }
                  Relationships: [
                    
                  ]
                },"exercises": {
                  Row: {
                    "created_at": string,"equipment": Database["public"]['Enums']["equipment"],"id": string,"instructions_he": string | null,"is_archived": boolean,"muscle_group": Database["public"]['Enums']["muscle_group"],"name_en": string | null,"name_he": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"equipment": Database["public"]['Enums']["equipment"],"id"?: string,"instructions_he"?: string | null,"is_archived"?: boolean,"muscle_group": Database["public"]['Enums']["muscle_group"],"name_en"?: string | null,"name_he": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"equipment"?: Database["public"]['Enums']["equipment"],"id"?: string,"instructions_he"?: string | null,"is_archived"?: boolean,"muscle_group"?: Database["public"]['Enums']["muscle_group"],"name_en"?: string | null,"name_he"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"goal_day_templates": {
                  Row: {
                    "goal_id": string,"template_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "goal_id": string,"template_id": string,"weekday": number
                  }
                  Update: {
                    "goal_id"?: string,"template_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "goal_day_templates_goal_id_fkey"
      columns: ["goal_id"]
isOneToOne: false
      referencedRelation: "goals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "goal_day_templates_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "workout_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "cycle_off": number | null,"cycle_on": number | null,"end_date": string | null,"id": string,"start_date": string,"training_weekdays": (number)[] | null,"type": Database["public"]['Enums']["goal_type"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cycle_off"?: number | null,"cycle_on"?: number | null,"end_date"?: string | null,"id"?: string,"start_date": string,"training_weekdays"?: (number)[] | null,"type": Database["public"]['Enums']["goal_type"],"user_id": string
                  }
                  Update: {
                    "cycle_off"?: number | null,"cycle_on"?: number | null,"end_date"?: string | null,"id"?: string,"start_date"?: string,"training_weekdays"?: (number)[] | null,"type"?: Database["public"]['Enums']["goal_type"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"id": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"username": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"username"?: string
                  }
                  Relationships: [
                    
                  ]
                },"session_exercises": {
                  Row: {
                    "exercise_id": string,"id": string,"note": string | null,"position": number,"replaced_exercise_id": string | null,"session_id": string,"template_exercise_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"id"?: string,"note"?: string | null,"position": number,"replaced_exercise_id"?: string | null,"session_id": string,"template_exercise_id"?: string | null
                  }
                  Update: {
                    "exercise_id"?: string,"id"?: string,"note"?: string | null,"position"?: number,"replaced_exercise_id"?: string | null,"session_id"?: string,"template_exercise_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_replaced_exercise_id_fkey"
      columns: ["replaced_exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "workout_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_exercises_template_exercise_id_fkey"
      columns: ["template_exercise_id"]
isOneToOne: false
      referencedRelation: "template_exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"session_sets": {
                  Row: {
                    "id": string,"is_done": boolean,"reps": number | null,"session_exercise_id": string,"set_number": number,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_done"?: boolean,"reps"?: number | null,"session_exercise_id": string,"set_number": number,"weight_kg"?: number | null
                  }
                  Update: {
                    "id"?: string,"is_done"?: boolean,"reps"?: number | null,"session_exercise_id"?: string,"set_number"?: number,"weight_kg"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_sets_session_exercise_id_fkey"
      columns: ["session_exercise_id"]
isOneToOne: false
      referencedRelation: "session_exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"template_exercise_alternatives": {
                  Row: {
                    "exercise_id": string,"id": string,"position": number,"template_exercise_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"id"?: string,"position": number,"template_exercise_id": string
                  }
                  Update: {
                    "exercise_id"?: string,"id"?: string,"position"?: number,"template_exercise_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "template_exercise_alternatives_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "template_exercise_alternatives_template_exercise_id_fkey"
      columns: ["template_exercise_id"]
isOneToOne: false
      referencedRelation: "template_exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"template_exercises": {
                  Row: {
                    "exercise_id": string,"id": string,"note": string | null,"planned_sets": number,"position": number,"rep_range_max": number | null,"rep_range_min": number | null,"template_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id": string,"id"?: string,"note"?: string | null,"planned_sets"?: number,"position": number,"rep_range_max"?: number | null,"rep_range_min"?: number | null,"template_id": string
                  }
                  Update: {
                    "exercise_id"?: string,"id"?: string,"note"?: string | null,"planned_sets"?: number,"position"?: number,"rep_range_max"?: number | null,"rep_range_min"?: number | null,"template_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "template_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "template_exercises_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "workout_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_sessions": {
                  Row: {
                    "completed_at": string | null,"id": string,"note": string | null,"session_date": string,"started_at": string,"status": Database["public"]['Enums']["session_status"],"template_id": string | null,"template_name": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"id"?: string,"note"?: string | null,"session_date": string,"started_at"?: string,"status"?: Database["public"]['Enums']["session_status"],"template_id"?: string | null,"template_name"?: string | null,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"id"?: string,"note"?: string | null,"session_date"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["session_status"],"template_id"?: string | null,"template_name"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sessions_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "workout_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"workout_templates": {
                  Row: {
                    "created_at": string,"id": string,"is_archived": boolean,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_archived"?: boolean,"name": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_archived"?: boolean,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_visible_exercise":
{ Args: { "p_exercise_id": string }; Returns: boolean
                           },
"owns_goal":
{ Args: { "p_goal_id": string }; Returns: boolean
                           },
"owns_session":
{ Args: { "p_session_id": string }; Returns: boolean
                           },
"owns_session_exercise":
{ Args: { "p_session_exercise_id": string }; Returns: boolean
                           },
"owns_template":
{ Args: { "p_template_id": string }; Returns: boolean
                           },
"owns_template_exercise":
{ Args: { "p_template_exercise_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "challenge_status": "active"|"succeeded"|"failed","equipment": "machine"|"barbell"|"dumbbell"|"cable"|"bodyweight"|"kettlebell"|"band"|"other","goal_type": "fixed_days"|"cycle","muscle_group": "chest"|"back"|"shoulders"|"biceps"|"triceps"|"legs"|"glutes"|"core"|"full_body"|"cardio","session_status": "in_progress"|"completed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "challenge_status": ["active", "succeeded", "failed"],"equipment": ["machine", "barbell", "dumbbell", "cable", "bodyweight", "kettlebell", "band", "other"],"goal_type": ["fixed_days", "cycle"],"muscle_group": ["chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "core", "full_body", "cardio"],"session_status": ["in_progress", "completed"]
          }
        }
} as const
