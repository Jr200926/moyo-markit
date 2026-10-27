import { pathToFileURL } from "node:url";

export const BUCKETS = { photos: "listing-photos", videos: "listing-videos" };

export function pathFromUrl(url, bucket) {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

export function collectPaths(listings) {
  const photos = [];
  const videos = [];
  for (const l of listings) {
    for (const u of l.photos ?? []) {
      const p = pathFromUrl(u, BUCKETS.photos);
      if (p) photos.push(p);
    }
    const v = pathFromUrl(l.video_url, BUCKETS.videos);
    if (v) videos.push(v);
  }
  return { photos, videos };
}

export async function runCleanup(
  client,
  {
    graceDays = 30,
    dryRun = true,
    batchSize = 50,
    maxListings = 1000,
    now = new Date(),
    log = console.log,
  } = {},
) {
  if (!Number.isFinite(graceDays) || graceDays < 7) {
    throw new Error(`GRACE_DAYS invalido (${graceDays}): o minimo e 7 dias.`);
  }
  const cutoff = new Date(now.getTime() - graceDays * 86_400_000).toISOString();
  log(
    `Anuncios expirados antes de ${cutoff} (${graceDays} dias de tolerancia). ` +
      `Modo: ${dryRun ? "SIMULACAO (nada e apagado)" : "REAL"}`,
  );

  if (dryRun) {
    const { data, error } = await client
      .from("listings")
      .select("id,title,photos,video_url,expires_at")
      .lt("expires_at", cutoff)
      .order("expires_at", { ascending: true })
      .limit(maxListings);
    if (error) throw new Error(`Falha ao listar: ${error.message}`);
    const rows = data ?? [];
    for (const l of rows) log(`  [simulacao] apagaria: "${l.title}" (expirou em ${l.expires_at})`);
    const { photos, videos } = collectPaths(rows);
    return { listings: rows.length, files: photos.length + videos.length };
  }

  let listings = 0;
  let files = 0;
  while (listings < maxListings) {
    const { data, error } = await client
      .from("listings")
      .select("id,title,photos,video_url,expires_at")
      .lt("expires_at", cutoff)
      .order("expires_at", { ascending: true })
      .limit(batchSize);
    if (error) throw new Error(`Falha ao listar: ${error.message}`);
    if (!data || data.length === 0) break;

    const { photos, videos } = collectPaths(data);
    // 1) ficheiros primeiro: se algo falhar aqui, os anuncios ficam e a proxima corrida tenta de novo
    if (photos.length) {
      const { error: e } = await client.storage.from(BUCKETS.photos).remove(photos);
      if (e) throw new Error(`Falha ao apagar fotos: ${e.message}`);
    }
    if (videos.length) {
      const { error: e } = await client.storage.from(BUCKETS.videos).remove(videos);
      if (e) throw new Error(`Falha ao apagar videos: ${e.message}`);
    }
    // 2) so depois as linhas da base de dados
    const { error: delError } = await client
      .from("listings")
      .delete()
      .in(
        "id",
        data.map((l) => l.id),
      );
    if (delError) throw new Error(`Falha ao apagar anuncios: ${delError.message}`);

    for (const l of data) log(`  apagado: "${l.title}" (expirou em ${l.expires_at})`);
    listings += data.length;
    files += photos.length + videos.length;
  }
  return { listings, files };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltam as variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const result = await runCleanup(client, {
      graceDays: Number(process.env.GRACE_DAYS ?? 30),
      dryRun: process.env.DRY_RUN !== "false",
    });
    console.log(`Concluido: ${result.listings} anuncio(s), ${result.files} ficheiro(s).`);
  } catch (err) {
    console.error(`ERRO: ${err.message}`);
    process.exit(1);
  }
}
