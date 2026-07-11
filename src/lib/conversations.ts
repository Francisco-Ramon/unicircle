import { supabase } from "@/integrations/supabase/client";

export type Conversation = {
  id: string;
  title: string;
  last_message_at: string;
  created_at: string;
  title_generated: boolean;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: any;
  created_at: string;
};

export type StoredDocument = {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  conversation_id: string | null;
};

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, last_message_at, created_at, title_generated")
    .order("last_message_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function createConversation(): Promise<Conversation> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userData.user.id, title: "New conversation" })
    .select("id, title, last_message_at, created_at, title_generated")
    .single();
  if (error) throw error;
  return data;
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoredMessage[];
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function listDocuments(conversationId: string): Promise<StoredDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, filename, status, created_at, conversation_id")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
