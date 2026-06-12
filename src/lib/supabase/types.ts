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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_kalkulations_defaults: {
        Row: {
          id: boolean
          standard_afa: number
          standard_ek_prozent: number
          standard_haltedauer: number
          standard_tilgung: number
          standard_wertsteigerung: number
          standard_zins: number
          updated_at: string
        }
        Insert: {
          id?: boolean
          standard_afa?: number
          standard_ek_prozent?: number
          standard_haltedauer?: number
          standard_tilgung?: number
          standard_wertsteigerung?: number
          standard_zins?: number
          updated_at?: string
        }
        Update: {
          id?: boolean
          standard_afa?: number
          standard_ek_prozent?: number
          standard_haltedauer?: number
          standard_tilgung?: number
          standard_wertsteigerung?: number
          standard_zins?: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          at: string
          by_user_id: string
          entity_id: string | null
          entity_type: string
          id: string
          kunde_id: string | null
          meta: Json
        }
        Insert: {
          action: string
          at?: string
          by_user_id: string
          entity_id?: string | null
          entity_type: string
          id?: string
          kunde_id?: string | null
          meta?: Json
        }
        Update: {
          action?: string
          at?: string
          by_user_id?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          kunde_id?: string | null
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_by_user_id_fkey"
            columns: ["by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      einheiten: {
        Row: {
          afa_satz: number
          aufzug: boolean
          balkon: boolean
          bewegliche_wg: Json
          created_at: string
          energieklasse: string | null
          erhaltungsaufwand: number | null
          etage: number | null
          extras: string | null
          grundstuecksanteil_qm: number | null
          grundstueckswert_anteil: number | null
          hausgeld_nicht_umlagefaehig: number | null
          hausgeld_umlagefaehig: number | null
          heizungsart: string | null
          id: string
          instandhaltungsruecklage: number | null
          investagon_id: string | null
          kalkulation: Json
          kaufpreis: number | null
          keller: boolean
          miete: number | null
          mietvertrag_ende: string | null
          miteigentumsanteil: string | null
          nutzungsart: Database["public"]["Enums"]["nutzungsart"]
          objektzustand: Database["public"]["Enums"]["objektzustand"] | null
          organisation_id: string | null
          projekt_id: string
          raw: Json | null
          sondereigentumsverwaltung: number | null
          status: Database["public"]["Enums"]["einheit_status"]
          stellplaetze_anzahl: number
          stellplatz_preis: number | null
          updated_at: string
          vermietet: boolean
          vermietet_seit: string | null
          wohnflaeche: number | null
          wohnungsnummer: string
          zimmer: number | null
        }
        Insert: {
          afa_satz?: number
          aufzug?: boolean
          balkon?: boolean
          bewegliche_wg?: Json
          created_at?: string
          energieklasse?: string | null
          erhaltungsaufwand?: number | null
          etage?: number | null
          extras?: string | null
          grundstuecksanteil_qm?: number | null
          grundstueckswert_anteil?: number | null
          hausgeld_nicht_umlagefaehig?: number | null
          hausgeld_umlagefaehig?: number | null
          heizungsart?: string | null
          id?: string
          instandhaltungsruecklage?: number | null
          investagon_id?: string | null
          kalkulation?: Json
          kaufpreis?: number | null
          keller?: boolean
          miete?: number | null
          mietvertrag_ende?: string | null
          miteigentumsanteil?: string | null
          nutzungsart?: Database["public"]["Enums"]["nutzungsart"]
          objektzustand?: Database["public"]["Enums"]["objektzustand"] | null
          organisation_id?: string | null
          projekt_id: string
          raw?: Json | null
          sondereigentumsverwaltung?: number | null
          status?: Database["public"]["Enums"]["einheit_status"]
          stellplaetze_anzahl?: number
          stellplatz_preis?: number | null
          updated_at?: string
          vermietet?: boolean
          vermietet_seit?: string | null
          wohnflaeche?: number | null
          wohnungsnummer: string
          zimmer?: number | null
        }
        Update: {
          afa_satz?: number
          aufzug?: boolean
          balkon?: boolean
          bewegliche_wg?: Json
          created_at?: string
          energieklasse?: string | null
          erhaltungsaufwand?: number | null
          etage?: number | null
          extras?: string | null
          grundstuecksanteil_qm?: number | null
          grundstueckswert_anteil?: number | null
          hausgeld_nicht_umlagefaehig?: number | null
          hausgeld_umlagefaehig?: number | null
          heizungsart?: string | null
          id?: string
          instandhaltungsruecklage?: number | null
          investagon_id?: string | null
          kalkulation?: Json
          kaufpreis?: number | null
          keller?: boolean
          miete?: number | null
          mietvertrag_ende?: string | null
          miteigentumsanteil?: string | null
          nutzungsart?: Database["public"]["Enums"]["nutzungsart"]
          objektzustand?: Database["public"]["Enums"]["objektzustand"] | null
          organisation_id?: string | null
          projekt_id?: string
          raw?: Json | null
          sondereigentumsverwaltung?: number | null
          status?: Database["public"]["Enums"]["einheit_status"]
          stellplaetze_anzahl?: number
          stellplatz_preis?: number | null
          updated_at?: string
          vermietet?: boolean
          vermietet_seit?: string | null
          wohnflaeche?: number | null
          wohnungsnummer?: string
          zimmer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "einheiten_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisationen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "einheiten_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekte"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_kommentar: string | null
          beschreibung: string
          created_at: string
          id: string
          kategorie: Database["public"]["Enums"]["feedback_kategorie"]
          screenshot_url: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          submitter_id: string
          titel: string
          updated_at: string
        }
        Insert: {
          admin_kommentar?: string | null
          beschreibung: string
          created_at?: string
          id?: string
          kategorie: Database["public"]["Enums"]["feedback_kategorie"]
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          submitter_id: string
          titel: string
          updated_at?: string
        }
        Update: {
          admin_kommentar?: string | null
          beschreibung?: string
          created_at?: string
          id?: string
          kategorie?: Database["public"]["Enums"]["feedback_kategorie"]
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          submitter_id?: string
          titel?: string
          updated_at?: string
        }
        Relationships: []
      }
      finanzierungs_case_kommentare: {
        Row: {
          author_id: string
          case_id: string
          created_at: string
          id: string
          text: string
        }
        Insert: {
          author_id: string
          case_id: string
          created_at?: string
          id?: string
          text: string
        }
        Update: {
          author_id?: string
          case_id?: string
          created_at?: string
          id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "finanzierungs_case_kommentare_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_case_kommentare_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "finanzierungs_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_case_kommentare_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_for_finanzierer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_case_kommentare_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_for_vp"
            referencedColumns: ["id"]
          },
        ]
      }
      finanzierungs_cases: {
        Row: {
          assigned_at: string | null
          created_at: string
          created_by: string | null
          einheit_id: string | null
          final_status_at: string | null
          finanzierer_id: string | null
          finanzierungs_summe: number | null
          gesamtkosten: number | null
          id: string
          kunde_id: string
          laufzeit_jahre: number | null
          monatliche_rate: number | null
          notiz_finanzierer: string | null
          offer_accepted_at: string | null
          offer_filled_at: string | null
          sondertilgung_pa: number | null
          status: Database["public"]["Enums"]["case_status"]
          tilgung_initial: number | null
          updated_at: string
          vp_id: string
          zins_satz: number | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          created_by?: string | null
          einheit_id?: string | null
          final_status_at?: string | null
          finanzierer_id?: string | null
          finanzierungs_summe?: number | null
          gesamtkosten?: number | null
          id?: string
          kunde_id: string
          laufzeit_jahre?: number | null
          monatliche_rate?: number | null
          notiz_finanzierer?: string | null
          offer_accepted_at?: string | null
          offer_filled_at?: string | null
          sondertilgung_pa?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          tilgung_initial?: number | null
          updated_at?: string
          vp_id: string
          zins_satz?: number | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          created_by?: string | null
          einheit_id?: string | null
          final_status_at?: string | null
          finanzierer_id?: string | null
          finanzierungs_summe?: number | null
          gesamtkosten?: number | null
          id?: string
          kunde_id?: string
          laufzeit_jahre?: number | null
          monatliche_rate?: number | null
          notiz_finanzierer?: string | null
          offer_accepted_at?: string | null
          offer_filled_at?: string | null
          sondertilgung_pa?: number | null
          status?: Database["public"]["Enums"]["case_status"]
          tilgung_initial?: number | null
          updated_at?: string
          vp_id?: string
          zins_satz?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finanzierungs_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_cases_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_cases_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      investagon_sync_log: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          projects_synced: number | null
          properties_synced: number | null
          raw: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          projects_synced?: number | null
          properties_synced?: number | null
          raw?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          projects_synced?: number | null
          properties_synced?: number | null
          raw?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          commission_rate: number | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          parent_vp_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          vertriebsleiter_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          commission_rate?: number | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          parent_vp_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          vertriebsleiter_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          commission_rate?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          parent_vp_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          vertriebsleiter_id?: string | null
        }
        Relationships: []
      }
      kalkulationen: {
        Row: {
          afa: number | null
          created_at: string
          einheit_id: string
          ek_betrag: number | null
          ek_prozent: number | null
          erhaltungsaufwand: number | null
          ersteller_vp_id: string
          haltedauer: number | null
          id: string
          kaufnebenkosten_finanziert: boolean
          kunde_id: string
          miete_override: number | null
          notiz: string | null
          steuersatz: number | null
          tilgung: number | null
          updated_at: string
          wertsteigerung: number | null
          zins: number | null
        }
        Insert: {
          afa?: number | null
          created_at?: string
          einheit_id: string
          ek_betrag?: number | null
          ek_prozent?: number | null
          erhaltungsaufwand?: number | null
          ersteller_vp_id: string
          haltedauer?: number | null
          id?: string
          kaufnebenkosten_finanziert?: boolean
          kunde_id: string
          miete_override?: number | null
          notiz?: string | null
          steuersatz?: number | null
          tilgung?: number | null
          updated_at?: string
          wertsteigerung?: number | null
          zins?: number | null
        }
        Update: {
          afa?: number | null
          created_at?: string
          einheit_id?: string
          ek_betrag?: number | null
          ek_prozent?: number | null
          erhaltungsaufwand?: number | null
          ersteller_vp_id?: string
          haltedauer?: number | null
          id?: string
          kaufnebenkosten_finanziert?: boolean
          kunde_id?: string
          miete_override?: number | null
          notiz?: string | null
          steuersatz?: number | null
          tilgung?: number | null
          updated_at?: string
          wertsteigerung?: number | null
          zins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kalkulationen_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kalkulationen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      kommentare: {
        Row: {
          autor_id: string
          created_at: string
          id: string
          kontext_id: string
          kontext_typ: Database["public"]["Enums"]["kommentar_kontext"]
          text: string
        }
        Insert: {
          autor_id: string
          created_at?: string
          id?: string
          kontext_id: string
          kontext_typ: Database["public"]["Enums"]["kommentar_kontext"]
          text: string
        }
        Update: {
          autor_id?: string
          created_at?: string
          id?: string
          kontext_id?: string
          kontext_typ?: Database["public"]["Enums"]["kommentar_kontext"]
          text?: string
        }
        Relationships: []
      }
      kunden: {
        Row: {
          adresse: string | null
          anrede: Database["public"]["Enums"]["anrede_typ"] | null
          beruf_status: string | null
          bestehende_immobilien: boolean
          brutto_jahreseinkommen: number | null
          bundesland: string | null
          created_at: string
          eigenkapital: number | null
          email: string | null
          erwachsene_im_haushalt: number
          geburtsdatum: string | null
          id: string
          kinder_anzahl: number
          kreditverpflichtungen_monatlich: number
          max_darlehen: number | null
          max_finanzierbar: number | null
          max_monatsrate: number | null
          nachname: string | null
          persoenliche_daten: Json
          persoenlicher_steuersatz: number | null
          plz: string | null
          selbstauskunft_step: number
          selbstauskunft_submitted_at: string | null
          stadt: string | null
          status: Database["public"]["Enums"]["kunde_status"]
          steuersatz_durchschnitt: number | null
          telefon: string | null
          updated_at: string
          user_id: string | null
          verheiratet: boolean
          vorname: string | null
          vp_id: string
        }
        Insert: {
          adresse?: string | null
          anrede?: Database["public"]["Enums"]["anrede_typ"] | null
          beruf_status?: string | null
          bestehende_immobilien?: boolean
          brutto_jahreseinkommen?: number | null
          bundesland?: string | null
          created_at?: string
          eigenkapital?: number | null
          email?: string | null
          erwachsene_im_haushalt?: number
          geburtsdatum?: string | null
          id?: string
          kinder_anzahl?: number
          kreditverpflichtungen_monatlich?: number
          max_darlehen?: number | null
          max_finanzierbar?: number | null
          max_monatsrate?: number | null
          nachname?: string | null
          persoenliche_daten?: Json
          persoenlicher_steuersatz?: number | null
          plz?: string | null
          selbstauskunft_step?: number
          selbstauskunft_submitted_at?: string | null
          stadt?: string | null
          status?: Database["public"]["Enums"]["kunde_status"]
          steuersatz_durchschnitt?: number | null
          telefon?: string | null
          updated_at?: string
          user_id?: string | null
          verheiratet?: boolean
          vorname?: string | null
          vp_id: string
        }
        Update: {
          adresse?: string | null
          anrede?: Database["public"]["Enums"]["anrede_typ"] | null
          beruf_status?: string | null
          bestehende_immobilien?: boolean
          brutto_jahreseinkommen?: number | null
          bundesland?: string | null
          created_at?: string
          eigenkapital?: number | null
          email?: string | null
          erwachsene_im_haushalt?: number
          geburtsdatum?: string | null
          id?: string
          kinder_anzahl?: number
          kreditverpflichtungen_monatlich?: number
          max_darlehen?: number | null
          max_finanzierbar?: number | null
          max_monatsrate?: number | null
          nachname?: string | null
          persoenliche_daten?: Json
          persoenlicher_steuersatz?: number | null
          plz?: string | null
          selbstauskunft_step?: number
          selbstauskunft_submitted_at?: string | null
          stadt?: string | null
          status?: Database["public"]["Enums"]["kunde_status"]
          steuersatz_durchschnitt?: number | null
          telefon?: string | null
          updated_at?: string
          user_id?: string | null
          verheiratet?: boolean
          vorname?: string | null
          vp_id?: string
        }
        Relationships: []
      }
      kunden_dokumente: {
        Row: {
          dateiname: string
          deleted_at: string | null
          id: string
          kategorie: string
          kunde_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          dateiname: string
          deleted_at?: string | null
          id?: string
          kategorie: string
          kunde_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          dateiname?: string
          deleted_at?: string | null
          id?: string
          kategorie?: string
          kunde_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "kunden_dokumente_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kunden_dokumente_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kundenlinks: {
        Row: {
          accessed_count: number
          created_at: string
          einheit_id: string
          expires_at: string
          id: string
          kunde_id: string
          last_accessed_at: string | null
          token: string
          vp_id: string
        }
        Insert: {
          accessed_count?: number
          created_at?: string
          einheit_id: string
          expires_at?: string
          id?: string
          kunde_id: string
          last_accessed_at?: string | null
          token: string
          vp_id: string
        }
        Update: {
          accessed_count?: number
          created_at?: string
          einheit_id?: string
          expires_at?: string
          id?: string
          kunde_id?: string
          last_accessed_at?: string | null
          token?: string
          vp_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          meta: Json
          read_at: string | null
          titel: string
          typ: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          meta?: Json
          read_at?: string | null
          titel: string
          typ: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          meta?: Json
          read_at?: string | null
          titel?: string
          typ?: string
          user_id?: string
        }
        Relationships: []
      }
      objekt_bilder: {
        Row: {
          alt: string | null
          created_at: string
          deleted_at: string | null
          ebene: Database["public"]["Enums"]["objekt_ebene"]
          einheit_id: string | null
          id: string
          is_cover: boolean
          projekt_id: string | null
          public_url: string | null
          sort_order: number
          uploaded_by: string | null
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          deleted_at?: string | null
          ebene?: Database["public"]["Enums"]["objekt_ebene"]
          einheit_id?: string | null
          id?: string
          is_cover?: boolean
          projekt_id?: string | null
          public_url?: string | null
          sort_order?: number
          uploaded_by?: string | null
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          deleted_at?: string | null
          ebene?: Database["public"]["Enums"]["objekt_ebene"]
          einheit_id?: string | null
          id?: string
          is_cover?: boolean
          projekt_id?: string | null
          public_url?: string | null
          sort_order?: number
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekt_bilder_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_bilder_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_dokumente: {
        Row: {
          created_at: string
          dateiname: string
          deleted_at: string | null
          ebene: Database["public"]["Enums"]["objekt_ebene"]
          einheit_id: string | null
          id: string
          kategorie: Database["public"]["Enums"]["dokument_kategorie"]
          mime_type: string | null
          projekt_id: string | null
          size_bytes: number | null
          sort_order: number
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          dateiname: string
          deleted_at?: string | null
          ebene?: Database["public"]["Enums"]["objekt_ebene"]
          einheit_id?: string | null
          id?: string
          kategorie: Database["public"]["Enums"]["dokument_kategorie"]
          mime_type?: string | null
          projekt_id?: string | null
          size_bytes?: number | null
          sort_order?: number
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          dateiname?: string
          deleted_at?: string | null
          ebene?: Database["public"]["Enums"]["objekt_ebene"]
          einheit_id?: string | null
          id?: string
          kategorie?: Database["public"]["Enums"]["dokument_kategorie"]
          mime_type?: string | null
          projekt_id?: string | null
          size_bytes?: number | null
          sort_order?: number
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekt_dokumente_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objekt_dokumente_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekte"
            referencedColumns: ["id"]
          },
        ]
      }
      objekt_kunde_zuweisungen: {
        Row: {
          created_at: string
          einheit_id: string
          id: string
          kunde_id: string
          notiz: string | null
          status: Database["public"]["Enums"]["zuweisung_status"]
          updated_at: string
          vp_id: string
        }
        Insert: {
          created_at?: string
          einheit_id: string
          id?: string
          kunde_id: string
          notiz?: string | null
          status?: Database["public"]["Enums"]["zuweisung_status"]
          updated_at?: string
          vp_id: string
        }
        Update: {
          created_at?: string
          einheit_id?: string
          id?: string
          kunde_id?: string
          notiz?: string | null
          status?: Database["public"]["Enums"]["zuweisung_status"]
          updated_at?: string
          vp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "okz_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okz_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okz_vp_id_fkey"
            columns: ["vp_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string
          organisation_id: string
          rolle: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organisation_id: string
          rolle?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organisation_id?: string
          rolle?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisationen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisationen: {
        Row: {
          accent_color: string | null
          created_at: string
          id: string
          investagon_api_key: string | null
          investagon_org_id: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          primary_color: string | null
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          id?: string
          investagon_api_key?: string | null
          investagon_org_id?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          primary_color?: string | null
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          id?: string
          investagon_api_key?: string | null
          investagon_org_id?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          primary_color?: string | null
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisationen_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_organisation_id: string | null
          address: string | null
          anrede: Database["public"]["Enums"]["anrede_typ"] | null
          avatar_url: string | null
          bank_bic: string | null
          bank_iban: string | null
          bank_kontoinhaber: string | null
          branding_color: string | null
          branding_logo_url: string | null
          bundesland: string | null
          calc_defaults: Json
          created_at: string
          email: string | null
          geburtsdatum: string | null
          iban: string | null
          id: string
          kalkulations_defaults: Json
          nachname: string | null
          name: string | null
          persoenlicher_steuersatz: number | null
          phone: string | null
          plz: string | null
          stadt: string | null
          steuersatz_durchschnitt: number | null
          updated_at: string
          vorname: string | null
        }
        Insert: {
          active_organisation_id?: string | null
          address?: string | null
          anrede?: Database["public"]["Enums"]["anrede_typ"] | null
          avatar_url?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_kontoinhaber?: string | null
          branding_color?: string | null
          branding_logo_url?: string | null
          bundesland?: string | null
          calc_defaults?: Json
          created_at?: string
          email?: string | null
          geburtsdatum?: string | null
          iban?: string | null
          id: string
          kalkulations_defaults?: Json
          nachname?: string | null
          name?: string | null
          persoenlicher_steuersatz?: number | null
          phone?: string | null
          plz?: string | null
          stadt?: string | null
          steuersatz_durchschnitt?: number | null
          updated_at?: string
          vorname?: string | null
        }
        Update: {
          active_organisation_id?: string | null
          address?: string | null
          anrede?: Database["public"]["Enums"]["anrede_typ"] | null
          avatar_url?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_kontoinhaber?: string | null
          branding_color?: string | null
          branding_logo_url?: string | null
          bundesland?: string | null
          calc_defaults?: Json
          created_at?: string
          email?: string | null
          geburtsdatum?: string | null
          iban?: string | null
          id?: string
          kalkulations_defaults?: Json
          nachname?: string | null
          name?: string | null
          persoenlicher_steuersatz?: number | null
          phone?: string | null
          plz?: string | null
          stadt?: string | null
          steuersatz_durchschnitt?: number | null
          updated_at?: string
          vorname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_organisation_id_fkey"
            columns: ["active_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisationen"
            referencedColumns: ["id"]
          },
        ]
      }
      projekte: {
        Row: {
          adresse: string
          bank_bic: string | null
          bank_iban: string | null
          bank_kontoinhaber: string | null
          baujahr: number | null
          bautraeger: string | null
          bundesland: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          energieausweis: Json | null
          finanzierer_ids: string[]
          finanzierer_round_robin_counter: number
          geo: Json | null
          hausunterlagen: Json | null
          id: string
          instandhaltungsruecklage_gesamt: number | null
          investagon_id: string | null
          kalkulations_defaults: Json | null
          lage_daten: Json | null
          mietrendite_brutto: number | null
          name: string | null
          organisation_id: string | null
          plz: string | null
          projekt_typ: Database["public"]["Enums"]["projekt_typ"]
          raw: Json | null
          stadt: string | null
          updated_at: string
          visibility_reviewed_at: string | null
        }
        Insert: {
          adresse: string
          bank_bic?: string | null
          bank_iban?: string | null
          bank_kontoinhaber?: string | null
          baujahr?: number | null
          bautraeger?: string | null
          bundesland?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          energieausweis?: Json | null
          finanzierer_ids?: string[]
          finanzierer_round_robin_counter?: number
          geo?: Json | null
          hausunterlagen?: Json | null
          id?: string
          instandhaltungsruecklage_gesamt?: number | null
          investagon_id?: string | null
          kalkulations_defaults?: Json | null
          lage_daten?: Json | null
          mietrendite_brutto?: number | null
          name?: string | null
          organisation_id?: string | null
          plz?: string | null
          projekt_typ?: Database["public"]["Enums"]["projekt_typ"]
          raw?: Json | null
          stadt?: string | null
          updated_at?: string
          visibility_reviewed_at?: string | null
        }
        Update: {
          adresse?: string
          bank_bic?: string | null
          bank_iban?: string | null
          bank_kontoinhaber?: string | null
          baujahr?: number | null
          bautraeger?: string | null
          bundesland?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          energieausweis?: Json | null
          finanzierer_ids?: string[]
          finanzierer_round_robin_counter?: number
          geo?: Json | null
          hausunterlagen?: Json | null
          id?: string
          instandhaltungsruecklage_gesamt?: number | null
          investagon_id?: string | null
          kalkulations_defaults?: Json | null
          lage_daten?: Json | null
          mietrendite_brutto?: number | null
          name?: string | null
          organisation_id?: string | null
          plz?: string | null
          projekt_typ?: Database["public"]["Enums"]["projekt_typ"]
          raw?: Json | null
          stadt?: string | null
          updated_at?: string
          visibility_reviewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projekte_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisationen"
            referencedColumns: ["id"]
          },
        ]
      }
      provisionen: {
        Row: {
          betrag: number
          created_at: string
          deal_id: string | null
          id: string
          provisionssatz: number
          status: Database["public"]["Enums"]["provision_status"]
          updated_at: string
          vp_id: string
        }
        Insert: {
          betrag: number
          created_at?: string
          deal_id?: string | null
          id?: string
          provisionssatz: number
          status?: Database["public"]["Enums"]["provision_status"]
          updated_at?: string
          vp_id: string
        }
        Update: {
          betrag?: number
          created_at?: string
          deal_id?: string | null
          id?: string
          provisionssatz?: number
          status?: Database["public"]["Enums"]["provision_status"]
          updated_at?: string
          vp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provisionen_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "reservierungen"
            referencedColumns: ["id"]
          },
        ]
      }
      reservierungen: {
        Row: {
          audit_timestamp: string | null
          audit_user_agent: string | null
          bank_bic: string | null
          bank_iban: string | null
          bank_kontoinhaber: string | null
          bemerkungen: string | null
          created_at: string
          einheit_id: string
          expired_notified_at: string | null
          expires_at: string
          id: string
          ip: unknown
          kunde_id: string
          pdf_url: string | null
          reminder_3d_sent_at: string | null
          reminder_7d_sent_at: string | null
          reservierungsgebuehr: number
          signatur_data_url: string | null
          signatur_pdf: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["reservierung_status"]
          updated_at: string
          vp_id: string
        }
        Insert: {
          audit_timestamp?: string | null
          audit_user_agent?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_kontoinhaber?: string | null
          bemerkungen?: string | null
          created_at?: string
          einheit_id: string
          expired_notified_at?: string | null
          expires_at?: string
          id?: string
          ip?: unknown
          kunde_id: string
          pdf_url?: string | null
          reminder_3d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          reservierungsgebuehr?: number
          signatur_data_url?: string | null
          signatur_pdf?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["reservierung_status"]
          updated_at?: string
          vp_id: string
        }
        Update: {
          audit_timestamp?: string | null
          audit_user_agent?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_kontoinhaber?: string | null
          bemerkungen?: string | null
          created_at?: string
          einheit_id?: string
          expired_notified_at?: string | null
          expires_at?: string
          id?: string
          ip?: unknown
          kunde_id?: string
          pdf_url?: string | null
          reminder_3d_sent_at?: string | null
          reminder_7d_sent_at?: string | null
          reservierungsgebuehr?: number
          signatur_data_url?: string | null
          signatur_pdf?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["reservierung_status"]
          updated_at?: string
          vp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservierungen_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservierungen_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservierungen_vp_id_profiles_fkey"
            columns: ["vp_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      vp_hierarchy: {
        Row: {
          commission_rate: number
          created_at: string
          level: number
          parent_vp_id: string | null
          updated_at: string
          vertriebsleiter_id: string
          vp_id: string
        }
        Insert: {
          commission_rate: number
          created_at?: string
          level: number
          parent_vp_id?: string | null
          updated_at?: string
          vertriebsleiter_id: string
          vp_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          level?: number
          parent_vp_id?: string | null
          updated_at?: string
          vertriebsleiter_id?: string
          vp_id?: string
        }
        Relationships: []
      }
      vp_objekt_visibility: {
        Row: {
          created_at: string
          created_by: string | null
          projekt_id: string
          vp_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          projekt_id: string
          vp_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          projekt_id?: string
          vp_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vp_objekt_visibility_projekt_id_fkey"
            columns: ["projekt_id"]
            isOneToOne: false
            referencedRelation: "projekte"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_case_for_finanzierer: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          einheit_id: string | null
          final_status_at: string | null
          finanzierer_id: string | null
          finanzierungs_summe: number | null
          gesamtkosten: number | null
          id: string | null
          kunde_id: string | null
          laufzeit_jahre: number | null
          monatliche_rate: number | null
          notiz_finanzierer: string | null
          offer_accepted_at: string | null
          offer_filled_at: string | null
          sondertilgung_pa: number | null
          status: Database["public"]["Enums"]["case_status"] | null
          tilgung_initial: number | null
          vp_label: string | null
          zins_satz: number | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          einheit_id?: string | null
          final_status_at?: string | null
          finanzierer_id?: string | null
          finanzierungs_summe?: number | null
          gesamtkosten?: number | null
          id?: string | null
          kunde_id?: string | null
          laufzeit_jahre?: number | null
          monatliche_rate?: number | null
          notiz_finanzierer?: string | null
          offer_accepted_at?: string | null
          offer_filled_at?: string | null
          sondertilgung_pa?: number | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tilgung_initial?: number | null
          vp_label?: never
          zins_satz?: number | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          einheit_id?: string | null
          final_status_at?: string | null
          finanzierer_id?: string | null
          finanzierungs_summe?: number | null
          gesamtkosten?: number | null
          id?: string | null
          kunde_id?: string | null
          laufzeit_jahre?: number | null
          monatliche_rate?: number | null
          notiz_finanzierer?: string | null
          offer_accepted_at?: string | null
          offer_filled_at?: string | null
          sondertilgung_pa?: number | null
          status?: Database["public"]["Enums"]["case_status"] | null
          tilgung_initial?: number | null
          vp_label?: never
          zins_satz?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finanzierungs_cases_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_cases_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      v_case_for_vp: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          einheit_id: string | null
          final_status_at: string | null
          finanzierer_label: string | null
          finanzierungs_summe: number | null
          gesamtkosten: number | null
          id: string | null
          kunde_id: string | null
          laufzeit_jahre: number | null
          monatliche_rate: number | null
          notiz_finanzierer: string | null
          offer_accepted_at: string | null
          offer_filled_at: string | null
          sondertilgung_pa: number | null
          status: Database["public"]["Enums"]["case_status"] | null
          tilgung_initial: number | null
          vp_id: string | null
          zins_satz: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finanzierungs_cases_einheit_id_fkey"
            columns: ["einheit_id"]
            isOneToOne: false
            referencedRelation: "einheiten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_cases_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "kunden"
            referencedColumns: ["id"]
          },
        ]
      }
      v_case_kommentare_pseudonym: {
        Row: {
          author_id: string | null
          author_label: string | null
          case_id: string | null
          created_at: string | null
          id: string | null
          text: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finanzierungs_case_kommentare_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_case_kommentare_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "finanzierungs_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_case_kommentare_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_for_finanzierer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finanzierungs_case_kommentare_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_for_vp"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_finanzierer_to_pool: {
        Args: { p_finanzierer_id: string; p_projekt_id: string }
        Returns: Json
      }
      can_access_case: { Args: { _case_id: string }; Returns: boolean }
      can_access_kunde: { Args: { _kunde_id: string }; Returns: boolean }
      can_read_einheit: { Args: { _einheit_id: string }; Returns: boolean }
      can_read_projekt: { Args: { _projekt_id: string }; Returns: boolean }
      consume_kundenlink: { Args: { _token: string }; Returns: Json }
      create_einheit_in_projekt: {
        Args: {
          p_etage?: number
          p_kaufpreis?: number
          p_miete?: number
          p_projekt_id: string
          p_wohnflaeche?: number
          p_wohnungsnummer: string
          p_zimmer?: number
        }
        Returns: string
      }
      create_projekt_quick: {
        Args: {
          p_adresse: string
          p_baujahr?: number
          p_bautraeger?: string
          p_etage?: number
          p_geo?: Json
          p_kaufpreis?: number
          p_miete?: number
          p_name: string
          p_plz: string
          p_stadt: string
          p_typ: Database["public"]["Enums"]["projekt_typ"]
          p_vermietet?: boolean
          p_wohnflaeche?: number
          p_wohnungsnummer?: string
          p_zimmer?: number
        }
        Returns: {
          einheit_id: string
          projekt_id: string
        }[]
      }
      finanzierer_sees_einheit: {
        Args: { _einheit_id: string }
        Returns: boolean
      }
      finanzierer_sees_projekt: {
        Args: { _projekt_id: string }
        Returns: boolean
      }
      get_my_kunde_cases: {
        Args: never
        Returns: {
          created_at: string
          einheit_id: string
          id: string
          status: Database["public"]["Enums"]["case_status"]
          updated_at: string
        }[]
      }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_my_vp: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          id: string
          nachname: string
          name: string
          phone: string
          vorname: string
        }[]
      }
      get_projekt_completeness: {
        Args: { p_projekt_id: string }
        Returns: Json
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_descendant_of: {
        Args: { _ancestor: string; _descendant: string }
        Returns: boolean
      }
      is_in_my_subtree: { Args: { _target: string }; Returns: boolean }
      is_internal_non_kunde: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      list_bautraeger_suggest: {
        Args: never
        Returns: {
          bautraeger: string
        }[]
      }
      list_finanzierer_for_pool: {
        Args: { p_projekt_id: string }
        Returns: {
          avatar_url: string
          email: string
          id: string
          in_pool: boolean
          nachname: string
          name: string
          phone: string
          pool_position: number
          vorname: string
        }[]
      }
      mark_projekt_visibility_reviewed: {
        Args: { p_projekt_id: string }
        Returns: string
      }
      remove_finanzierer_from_pool: {
        Args: { p_finanzierer_id: string; p_projekt_id: string }
        Returns: Json
      }
      request_finanzierung: {
        Args: { p_einheit_id: string; p_kunde_id: string }
        Returns: string
      }
      submit_selbstauskunft:
        | {
            Args: {
              _adresse: string
              _anrede: Database["public"]["Enums"]["anrede_typ"]
              _beruf_status: string
              _bestehende_immobilien: boolean
              _brutto: number
              _eigenkapital: number
              _erwachsene: number
              _geburtsdatum: string
              _kinder: number
              _kreditverpflichtungen: number
              _max_darlehen: number
              _max_finanzierbar: number
              _max_monatsrate: number
              _nachname: string
              _plz: string
              _stadt: string
              _steuersatz_durchschnitt: number
              _steuersatz_grenze: number
              _verheiratet: boolean
              _vorname: string
            }
            Returns: Json
          }
        | {
            Args: {
              _adresse: string
              _anrede: Database["public"]["Enums"]["anrede_typ"]
              _beruf_status: string
              _bestehende_immobilien: boolean
              _brutto: number
              _bundesland?: string
              _eigenkapital: number
              _erwachsene: number
              _geburtsdatum: string
              _kinder: number
              _kreditverpflichtungen: number
              _max_darlehen: number
              _max_finanzierbar: number
              _max_monatsrate: number
              _nachname: string
              _plz: string
              _stadt: string
              _steuersatz_durchschnitt: number
              _steuersatz_grenze: number
              _telefon?: string
              _verheiratet: boolean
              _vorname: string
            }
            Returns: Json
          }
      verify_trigger_defense: {
        Args: never
        Returns: {
          allowed_test: string
          blocked_test: string
          error_message: string
          trigger_name: string
        }[]
      }
      vp_sees_projekt: { Args: { _projekt_id: string }; Returns: boolean }
    }
    Enums: {
      anrede_typ: "herr" | "frau" | "divers"
      app_role:
        | "admin"
        | "support"
        | "vertriebsleiter"
        | "vp_l1"
        | "vp_l2"
        | "vp_l3"
        | "kunde"
        | "finanzierer"
      case_status:
        | "neu"
        | "in_pruefung"
        | "angefragt"
        | "genehmigt"
        | "abgelehnt"
        | "ausgezahlt"
        | "in_bearbeitung"
        | "unterlagen_fehlen"
        | "angebot_vorhanden"
        | "angebot_beim_kunden"
        | "angebot_akzeptiert"
        | "bewilligt"
        | "storniert"
      dokument_kategorie:
        | "grundriss"
        | "expose"
        | "energieausweis"
        | "teilungserklaerung"
        | "mietvertrag"
        | "kaufvertrag"
        | "protokoll_eigentuemerversammlung"
        | "sonstiges"
        | "wirtschaftsplan"
      einheit_status:
        | "verfuegbar"
        | "reserviert"
        | "in_finanzierung"
        | "kaufvertrag_bestellt"
        | "notartermin"
        | "verkauft"
        | "abgebrochen"
      feedback_kategorie:
        | "ui_ux"
        | "bug"
        | "feature"
        | "performance"
        | "sonstiges"
      feedback_status:
        | "neu"
        | "in_review"
        | "geplant"
        | "implementiert"
        | "abgelehnt"
      kommentar_kontext:
        | "objekt"
        | "einheit"
        | "case"
        | "kunde"
        | "reservierung"
        | "ticket"
      kunde_status:
        | "lead"
        | "aktiviert"
        | "bonitaet_geprueft"
        | "reserviert"
        | "beurkundet"
      nutzungsart: "wohnen" | "gewerbe"
      objekt_ebene: "projekt" | "einheit"
      objektzustand: "bestand" | "neubau"
      projekt_typ: "mfh" | "etw_einzeln"
      provision_status:
        | "pipeline"
        | "verdient"
        | "in_auszahlung"
        | "ausgezahlt"
        | "storniert"
      reservierung_status:
        | "entwurf"
        | "angefragt"
        | "reserviert"
        | "abgelaufen"
        | "storniert"
        | "konvertiert"
      ticket_status:
        | "offen"
        | "in_bearbeitung"
        | "wartet_auf_kunde"
        | "geschlossen"
      ticket_typ: "support" | "technisch" | "rueckfrage" | "sonstiges"
      zuweisung_status:
        | "vorgeschlagen"
        | "zugewiesen"
        | "in_bearbeitung"
        | "abgeschlossen"
        | "abgelehnt"
        | "kalkulation_erstellt"
        | "praesentation_gehalten"
        | "reserviert"
        | "verkauft"
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
      anrede_typ: ["herr", "frau", "divers"],
      app_role: [
        "admin",
        "support",
        "vertriebsleiter",
        "vp_l1",
        "vp_l2",
        "vp_l3",
        "kunde",
        "finanzierer",
      ],
      case_status: [
        "neu",
        "in_pruefung",
        "angefragt",
        "genehmigt",
        "abgelehnt",
        "ausgezahlt",
        "in_bearbeitung",
        "unterlagen_fehlen",
        "angebot_vorhanden",
        "angebot_beim_kunden",
        "angebot_akzeptiert",
        "bewilligt",
        "storniert",
      ],
      dokument_kategorie: [
        "grundriss",
        "expose",
        "energieausweis",
        "teilungserklaerung",
        "mietvertrag",
        "kaufvertrag",
        "protokoll_eigentuemerversammlung",
        "sonstiges",
        "wirtschaftsplan",
      ],
      einheit_status: [
        "verfuegbar",
        "reserviert",
        "in_finanzierung",
        "kaufvertrag_bestellt",
        "notartermin",
        "verkauft",
        "abgebrochen",
      ],
      feedback_kategorie: [
        "ui_ux",
        "bug",
        "feature",
        "performance",
        "sonstiges",
      ],
      feedback_status: [
        "neu",
        "in_review",
        "geplant",
        "implementiert",
        "abgelehnt",
      ],
      kommentar_kontext: [
        "objekt",
        "einheit",
        "case",
        "kunde",
        "reservierung",
        "ticket",
      ],
      kunde_status: [
        "lead",
        "aktiviert",
        "bonitaet_geprueft",
        "reserviert",
        "beurkundet",
      ],
      nutzungsart: ["wohnen", "gewerbe"],
      objekt_ebene: ["projekt", "einheit"],
      objektzustand: ["bestand", "neubau"],
      projekt_typ: ["mfh", "etw_einzeln"],
      provision_status: [
        "pipeline",
        "verdient",
        "in_auszahlung",
        "ausgezahlt",
        "storniert",
      ],
      reservierung_status: [
        "entwurf",
        "angefragt",
        "reserviert",
        "abgelaufen",
        "storniert",
        "konvertiert",
      ],
      ticket_status: [
        "offen",
        "in_bearbeitung",
        "wartet_auf_kunde",
        "geschlossen",
      ],
      ticket_typ: ["support", "technisch", "rueckfrage", "sonstiges"],
      zuweisung_status: [
        "vorgeschlagen",
        "zugewiesen",
        "in_bearbeitung",
        "abgeschlossen",
        "abgelehnt",
        "kalkulation_erstellt",
        "praesentation_gehalten",
        "reserviert",
        "verkauft",
      ],
    },
  },
} as const
