import { getSupabaseRestConfig } from "@/lib/supabase-api";

export type CloudNote = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  created_at?: string;
  updated_at?: string;
};

function headers(accessToken: string, prefer?: string) {
  const { key } = getSupabaseRestConfig();

  return {
    apikey: key,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function parse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Erro no banco de dados.");
  }

  return data;
}

async function get(accessToken: string): Promise<CloudNote[]> {
  const { url } = getSupabaseRestConfig();
  const params = new URLSearchParams();

  params.set("select", "*");
  params.set("order", "pinned.desc,updated_at.desc");

  const response = await fetch(`${url}/rest/v1/notes?${params.toString()}`, {
    headers: headers(accessToken),
  });

  return (await parse(response)) || [];
}

async function save(
  accessToken: string,
  userId: string,
  note: Pick<CloudNote, "title" | "content" | "category" | "pinned">
) {
  const { url } = getSupabaseRestConfig();

  const response = await fetch(`${url}/rest/v1/notes`, {
    method: "POST",
    headers: headers(accessToken, "return=representation"),
    body: JSON.stringify({ ...note, user_id: userId }),
  });

  const data = await parse(response);
  return data?.[0] as CloudNote;
}

async function update(
  accessToken: string,
  id: string,
  changes: Partial<Pick<CloudNote, "title" | "content" | "category" | "pinned">>
) {
  const { url } = getSupabaseRestConfig();

  const response = await fetch(`${url}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(accessToken, "return=representation"),
    body: JSON.stringify({
      ...changes,
      updated_at: new Date().toISOString(),
    }),
  });

  const data = await parse(response);
  return data?.[0] as CloudNote;
}

async function remove(accessToken: string, id: string) {
  const { url } = getSupabaseRestConfig();

  const response = await fetch(`${url}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(accessToken),
  });

  if (!response.ok) {
    await parse(response);
  }
}

export const cloudNoteStorage = { get, save, update, remove };
