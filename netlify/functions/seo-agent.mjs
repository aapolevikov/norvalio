// SEO-AGENT API v1.0 — Norvalio. Состояние команды, доска, статьи.
import { getStore } from "@netlify/blobs";

const DEFAULT_PLAN = [
  "Сайт для салона красоты в Дубае: что должно быть и сколько стоит",
  "Сайт для клиники и медцентра в ОАЭ: требования и цены",
  "Сайт для ресторана и кафе в Дубае: меню, бронь, доставка",
  "Сайт для риелтора в Дубае: как получать заявки на недвижимость",
  "Как принимать оплату на сайте в ОАЭ: Stripe, Tap, Telr",
  "Реклама в Instagram и Facebook для бизнеса в Дубае: с чего начать",
  "Click-to-WhatsApp реклама: как получать заявки по 5-15 AED",
  "WhatsApp Business API: что это и зачем бизнесу в ОАЭ",
  "Google Business Profile в Дубае: как настроить и попасть в карты",
  "Продвижение в ChatGPT и ИИ-поиске (GEO): новая SEO-реальность 2026",
  "Сколько стоит реклама в Google в Дубае: реальные цифры",
  "Лендинг за неделю: как быстро проверить бизнес-идею в ОАЭ",
  "Тексты для сайта: как писать, чтобы покупали",
  "Почему сайт не приносит заявок: 12 причин и решения",
  "Домен и хостинг для бизнеса в ОАЭ: как выбрать",
  "Сайт на Тильде vs индивидуальная разработка: честное сравнение",
  "Мобильная версия сайта: почему 80% клиентов приходят с телефона",
  "Отзывы клиентов: как собирать и публиковать, чтобы доверяли",
  "Email-рассылки для малого бизнеса в ОАЭ: инструменты и цены",
  "CRM для салона красоты: записи, напоминания, база клиентов",
  "Автоматизация заявок: от WhatsApp до CRM без ручной работы",
  "Скорость сайта: как влияет на продажи и позиции в Google",
  "Структура продающей главной страницы: разбор по блокам",
  "Портфолио и кейсы на сайте: как оформить, чтобы продавали",
  "Юридические страницы сайта в ОАЭ: политика, оферта, cookies",
  "Как перевести сайт на английский и арабский правильно",
  "Аналитика для бизнеса: GA4 и Clarity простыми словами",
  "Редизайн старого сайта: когда пора и сколько стоит",
  "SEO-статьи для бизнеса: как блог приводит клиентов месяцами",
  "Чек-лист запуска сайта: 25 пунктов перед публикацией"
];

const AGENTS = {
  strategist: { name: "Стратег", desc: "Контент-план, выбор тем, брифы", color: "#ff5d73" },
  author: { name: "Автор", desc: "Пишет статьи и тексты", color: "#5d8bff" },
  editor: { name: "Редактор", desc: "Правит и усиливает тексты", color: "#b06bff" },
  tech: { name: "SEO-техник", desc: "Meta, schema, перелинковка", color: "#4dd0a6" },
  analyst: { name: "Аналитик", desc: "GSC, позиции, рекомендации", color: "#ffb84d" },
  qa: { name: "Контролёр", desc: "Оценка качества работы команды", color: "#ff8a5d" },
  publisher: { name: "Публикатор", desc: "Коммиты в GitHub (фаза 2)", color: "#6ba8ff" },
  secretary: { name: "Секретарь", desc: "Сводки и задачи для Александра", color: "#d3a6ff" }
};

function freshState() {
  const agents = {};
  Object.keys(AGENTS).forEach(k => {
    agents[k] = { key: k, name: AGENTS[k].name, desc: AGENTS[k].desc, color: AGENTS[k].color, status: k === "publisher" || k === "analyst" ? "off" : "idle", last: k === "analyst" ? "Жду доступ к GSC API" : (k === "publisher" ? "Жду GitHub-токен (фаза 2)" : "Готов к работе"), lastAt: null, runs: 0 };
  });
  return {
    v: 1, created: new Date().toISOString(),
    agents,
    plan: DEFAULT_PLAN,
    feed: [{ id: "w1", t: new Date().toISOString(), from: "Система", to: "Александр", text: "SEO-команда Norvalio создана. Нажмите «Запустить смену» — команда напишет первую статью.", kind: "sys" }],
    board: [
      { id: "b1", col: "queue", title: "Первая смена команды", desc: "Запустите смену кнопкой сверху — Стратег выберет тему, Автор напишет статью, Редактор и Контролёр проверят.", agent: "strategist", at: new Date().toISOString() }
    ],
    articles: [], shift: { running: false }, stats: { shifts: 0 }
  };
}

export default async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "state";
  const store = getStore("seo-agents");

  const PANEL = process.env.PANEL_KEY;
  if (PANEL && req.headers.get("x-panel-key") !== PANEL) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let st = await store.get("state", { type: "json" });
  if (!st) { st = freshState(); await store.setJSON("state", st); }

  if (action === "state") {
    return Response.json({ ok: true, state: st, hasApiKey: !!process.env.ANTHROPIC_API_KEY });
  }

  if (action === "article") {
    const slug = (url.searchParams.get("slug") || "").replace(/[^a-z0-9-]/g, "");
    const html = await store.get("article:" + slug);
    if (!html) return new Response("not found", { status: 404 });
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "content-disposition": 'attachment; filename="' + slug + '.ru.html"' } });
  }

  if (action === "run") {
    if (st.shift && st.shift.running) return Response.json({ ok: false, error: "Смена уже идёт" });
    const base = url.origin;
    // background-функция вернёт 202 сразу, работа продолжится в фоне
    fetch(base + "/.netlify/functions/seo-agent-run-background", { method: "POST" }).catch(() => {});
    return Response.json({ ok: true, started: true });
  }

  if (action === "move" && req.method === "POST") {
    const b = await req.json();
    const card = (st.board || []).find(c => c.id === b.id);
    if (card) { card.col = b.col; await store.setJSON("state", st); }
    return Response.json({ ok: true });
  }

  if (action === "addcard" && req.method === "POST") {
    const b = await req.json();
    st.board.push({ id: "u" + Date.now().toString(36), col: b.col || "queue", title: String(b.title || "").slice(0, 200), desc: String(b.desc || "").slice(0, 1000), agent: b.agent || "strategist", at: new Date().toISOString(), byUser: true });
    await store.setJSON("state", st);
    return Response.json({ ok: true });
  }

  if (action === "delcard" && req.method === "POST") {
    const b = await req.json();
    st.board = (st.board || []).filter(c => c.id !== b.id);
    await store.setJSON("state", st);
    return Response.json({ ok: true });
  }

  if (action === "plan" && req.method === "POST") {
    const b = await req.json();
    st.plan = (b.plan || []).map(s => String(s).slice(0, 300)).filter(Boolean).slice(0, 100);
    await store.setJSON("state", st);
    return Response.json({ ok: true, count: st.plan.length });
  }

  if (action === "reset" && req.method === "POST") {
    const fresh = freshState();
    fresh.articles = st.articles; // статьи не трогаем
    await store.setJSON("state", fresh);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
};
