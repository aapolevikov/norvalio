// SEO-AGENT CRON — запускает смену команды каждое утро (07:00 Дубай = 03:00 UTC)
export default async (req) => {
  const base = process.env.URL || "https://norvalio.com";
  try {
    await fetch(base + "/.netlify/functions/seo-agent-run-background", { method: "POST" });
    return new Response("shift triggered", { status: 200 });
  } catch (e) {
    return new Response("error: " + e.message, { status: 200 });
  }
};

export const config = { schedule: "0 3 * * *" };
