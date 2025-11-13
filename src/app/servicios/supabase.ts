import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://daxdomviqgtazwimoapl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRheGRvbXZpcWd0YXp3aW1vYXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzUzNDksImV4cCI6MjA3MTgxMTM0OX0.kZG_vXN9r4tj9r-rQIa9jfTIfxjbmIsAesXnZTNm85g';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  }

  get db() { return this.client; }
}
