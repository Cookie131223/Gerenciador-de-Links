import { getSupabaseRestConfig } from "@/lib/supabase-api";

export type CloudLink = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  category: string;
  created_at?: string;
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

async function get(accessToken: string, category?: string): Promise<CloudLink[]> {
  const { url } = getSupabaseRestConfig();
  const params = new URLSearchParams();

  params.set("select", "*");
  params.set("order", "created_at.desc");

  if (category) {
    params.set("category", `eq.${category}`);
  }

  const response = await fetch(`${url}/rest/v1/links?${params.toString()}`, {
    headers: headers(accessToken),
  });

  return (await parse(response)) || [];
}

async function save(
  accessToken: string,
  userId: string,
  newLink: Pick<CloudLink, "name" | "url" | "category">
) {
  const { url } = getSupabaseRestConfig();

  const response = await fetch(`${url}/rest/v1/links`, {
    method: "POST",
    headers: headers(accessToken, "return=representation"),
    body: JSON.stringify({
      ...newLink,
      user_id: userId,
    }),
  });

  const data = await parse(response);
  return data?.[0] as CloudLink;
}

async function update(
  accessToken: string,
  id: string,
  changes: Pick<CloudLink, "name" | "url" | "category">
) {
  const { url } = getSupabaseRestConfig();

  const response = await fetch(`${url}/rest/v1/links?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(accessToken, "return=representation"),
    body: JSON.stringify(changes),
  });

  const data = await parse(response);
  return data?.[0] as CloudLink;
}

async function remove(accessToken: string, id: string) {
  const { url } = getSupabaseRestConfig();

  const response = await fetch(`${url}/rest/v1/links?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(accessToken),
  });

  if (!response.ok) {
    await parse(response);
  }
}

export const cloudLinkStorage = {
  get,
  save,
  update,
  remove,
};
