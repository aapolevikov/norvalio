// SEO-AGENT SHIFT RUNNER (background) v1.0 — Norvalio
// Цепочка: Стратег → Автор → Редактор → SEO-техник → Контролёр → Секретарь
// Результаты: Netlify Blobs store "seo-agents" (state + article:{slug})
import { getStore } from "@netlify/blobs";

const MODEL = "claude-sonnet-4-6";
const API = "https://api.anthropic.com/v1/messages";

const GUIDES = [
  ["guide-website-for-business-uae.ru.html", "Зачем бизнесу в ОАЭ сайт"],
  ["guide-web-development-cost-dubai.ru.html", "Сколько стоит сайт в Дубае"],
  ["guide-landing-vs-website.ru.html", "Лендинг или многостраничный сайт"],
  ["guide-seo-dubai.ru.html", "SEO-продвижение в Дубае"],
  ["guide-google-yandex-uae.ru.html", "Google и Яндекс в ОАЭ"],
  ["guide-crm-small-business-dubai.ru.html", "CRM для малого бизнеса"],
  ["guide-business-automation-uae.ru.html", "Автоматизация бизнеса в ОАЭ"],
  ["guide-whatsapp-leads-website.ru.html", "Заявки в WhatsApp с сайта"],
  ["guide-multilingual-website-dubai.ru.html", "Многоязычный сайт в Дубае"],
  ["guide-choose-web-studio-dubai.ru.html", "Как выбрать веб-студию"]
];

function now() { return new Date().toISOString(); }
function id() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

async function claude(key, system, user, maxTokens) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens || 2000, system, messages: [{ role: "user", content: user }] })
  });
  if (!r.ok) throw new Error("Claude API " + r.status + ": " + (await r.text()).slice(0, 300));
  const d = await r.json();
  return d.content.map(b => b.text || "").join("");
}
function parseJSON(t) {
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("Нет JSON в ответе агента");
  return JSON.parse(t.slice(s, e + 1));
}

async function loadState(store) {
  return (await store.get("state", { type: "json" })) || null;
}
async function saveState(store, st) { await store.setJSON("state", st); }

function feed(st, from, to, text, kind) {
  st.feed.unshift({ id: id(), t: now(), from, to, text, kind: kind || "msg" });
  if (st.feed.length > 300) st.feed.length = 300;
}
function setAgent(st, key, status, action) {
  const a = st.agents[key];
  if (a) { a.status = status; a.last = action; a.lastAt = now(); if (status === "work") a.runs = (a.runs || 0) + 1; }
}

export default async (req) => {
  const store = getStore("seo-agents");
  const KEY = process.env.ANTHROPIC_API_KEY;
  let st = await loadState(store);
  if (!st) { return new Response("no state", { status: 200 }); }
  if (st.shift && st.shift.running) { return new Response("already running", { status: 200 }); }

  st.shift = { running: true, started: now(), step: "strategist", error: null };
  feed(st, "Система", "Команда", "Смена началась. Стратег выбирает тему дня.", "sys");
  Object.keys(st.agents).forEach(k => setAgent(st, k, "idle", st.agents[k].last));
  await saveState(store, st);

  try {
    if (!KEY) throw new Error("ANTHROPIC_API_KEY не задан в Netlify Env");

    const done = (st.articles || []).map(a => a.topic || a.title);
    const plan = (st.plan || []).filter(t => done.indexOf(t) === -1);
    if (!plan.length) throw new Error("Контент-план пуст — добавьте темы в Настройках");

    // ---- 1. СТРАТЕГ ----
    setAgent(st, "strategist", "work", "Выбирает тему и готовит бриф");
    await saveState(store, st);
    const stratOut = parseJSON(await claude(KEY,
      "Ты — SEO-стратег веб-студии Norvalio (Дубай, клиенты — русскоязычные владельцы малого бизнеса в ОАЭ). Отвечай ТОЛЬКО валидным JSON без markdown.",
      "Темы в очереди (выбери ОДНУ, самую ценную для лидогенерации):\n" + plan.slice(0, 10).map((t, i) => (i + 1) + ". " + t).join("\n") +
      "\n\nУже опубликовано: " + (done.join("; ") || "10 базовых гидов") +
      "\n\nВерни JSON: {\"topic\":\"выбранная тема как в списке\",\"brief\":\"бриф для автора 3-4 предложения: интент, кто ищет, какие боли, что обязательно раскрыть\",\"keywords\":[\"5-7 ключевых фраз\"]}",
      1200));
    setAgent(st, "strategist", "done", "Тема: " + stratOut.topic);
    feed(st, "Стратег", "Автор", "Тема дня: «" + stratOut.topic + "». Бриф: " + stratOut.brief, "handoff");
    st.shift.step = "author";
    await saveState(store, st);

    // ---- 2. АВТОР ----
    setAgent(st, "author", "work", "Пишет статью: " + stratOut.topic);
    await saveState(store, st);
    const artJSON = "{\"title\":\"H1 до 60 знаков\",\"metaTitle\":\"title до 60 знаков\",\"metaDesc\":\"description 140-160 знаков\",\"slug\":\"guide-latinskiy-slug\",\"lead\":\"вводный абзац 2 предложения\",\"capsule\":\"прямой ответ на главный вопрос 3-4 предложения с цифрами\",\"sections\":[{\"h2\":\"...\",\"html\":\"<p>...</p><ul><li>...</li></ul>\"}],\"faq\":[{\"q\":\"...\",\"a\":\"1-2 предложения\"}],\"related\":[\"3 slug из списка гидов\"]}";
    const author = parseJSON(await claude(KEY,
      "Ты — автор SEO-статей студии Norvalio. Пишешь по-русски, экспертно, конкретно, с цифрами и ценами в AED, без воды. Аудитория: русскоязычные владельцы бизнеса в Дубае/ОАЭ. Внутри html-секций вставляй 2-3 ссылки на страницы студии (websites.ru.html, seo.ru.html, crm.ru.html, automation.ru.html, offers.ru.html) и на гиды из списка. Отвечай ТОЛЬКО валидным JSON.",
      "Бриф стратега: " + stratOut.brief + "\nТема: " + stratOut.topic + "\nКлючевые фразы: " + stratOut.keywords.join(", ") +
      "\nСуществующие гиды (для ссылок и related): " + GUIDES.map(g => g[0] + " — " + g[1]).join("; ") +
      "\n\nНапиши статью 900-1300 слов, 5-7 секций h2, 5 FAQ. Slug начинай с guide- и заканчивай без .ru.html. Формат ответа строго: " + artJSON,
      6000));
    setAgent(st, "author", "done", "Черновик готов: " + author.title);
    feed(st, "Автор", "Редактор", "Черновик «" + author.title + "» готов (" + author.sections.length + " секций, " + author.faq.length + " FAQ). Передаю на проверку.", "handoff");
    st.shift.step = "editor";
    await saveState(store, st);

    // ---- 3. РЕДАКТОР ----
    setAgent(st, "editor", "work", "Проверяет черновик");
    await saveState(store, st);
    const editor = parseJSON(await claude(KEY,
      "Ты — строгий редактор. Улучшаешь текст: убираешь воду и канцелярит, усиливаешь заголовки, проверяешь факты на правдоподобность (цены ОАЭ 2026). Отвечай ТОЛЬКО валидным JSON той же структуры, что получил, плюс поле \"editorNote\" (что исправил, 1-2 предложения).",
      "Статья (JSON): " + JSON.stringify(author),
      6000));
    const article = editor;
    setAgent(st, "editor", "done", editor.editorNote || "Правки внесены");
    feed(st, "Редактор", "SEO-техник", "Правки: " + (editor.editorNote || "текст усилен") + ". Передаю на техпроверку.", "handoff");
    st.shift.step = "tech";
    await saveState(store, st);

    // ---- 4. SEO-ТЕХНИК ----
    setAgent(st, "tech", "work", "Проверяет meta, slug, перелинковку");
    await saveState(store, st);
    const tech = parseJSON(await claude(KEY,
      "Ты — технический SEO-специалист. Проверь и верни JSON: {\"metaTitle\":\"финальный, до 60 зн\",\"metaDesc\":\"финальный, 140-160 зн\",\"slug\":\"финальный slug guide-...\",\"issues\":[\"замечания если есть\"]}. Только JSON.",
      "metaTitle: " + article.metaTitle + "\nmetaDesc: " + article.metaDesc + "\nslug: " + article.slug + "\nТема: " + stratOut.topic + "\nКлючи: " + stratOut.keywords.join(", "),
      800));
    article.metaTitle = tech.metaTitle; article.metaDesc = tech.metaDesc;
    article.slug = (tech.slug || article.slug).replace(/\.ru\.html$/, "").replace(/[^a-z0-9-]/g, "-");
    setAgent(st, "tech", "done", "Meta и slug финализированы");
    feed(st, "SEO-техник", "Контролёр", "Meta ок" + (tech.issues && tech.issues.length ? ", замечания: " + tech.issues.join("; ") : ", замечаний нет") + ".", "handoff");
    st.shift.step = "qa";
    await saveState(store, st);

    // ---- 5. КОНТРОЛЁР КАЧЕСТВА ----
    setAgent(st, "qa", "work", "Финальная оценка");
    await saveState(store, st);
    const qa = parseJSON(await claude(KEY,
      "Ты — контролёр качества контента. Оцени статью по 10-балльной шкале (польза, конкретика, SEO, продающность) и верни JSON: {\"score\":8,\"verdict\":\"1-2 предложения\",\"publish\":true}. Только JSON.",
      "Заголовок: " + article.title + "\nКапсула: " + article.capsule + "\nСекции: " + article.sections.map(s => s.h2).join(" | ") + "\nПервая секция: " + (article.sections[0] ? article.sections[0].html.slice(0, 600) : ""),
      500));
    setAgent(st, "qa", "done", "Оценка: " + qa.score + "/10");
    feed(st, "Контролёр", "Секретарь", "Оценка " + qa.score + "/10. " + qa.verdict, "handoff");
    st.shift.step = "secretary";
    await saveState(store, st);

    // ---- СБОРКА HTML ----
    const fname = article.slug + ".ru.html";
    const html = buildHTML(article);
    await store.set("article:" + article.slug, html);

    // ---- 6. СЕКРЕТАРЬ ----
    setAgent(st, "secretary", "work", "Готовит сводку и задачи");
    st.articles = st.articles || [];
    st.articles.unshift({ slug: article.slug, file: fname, title: article.title, topic: stratOut.topic, score: qa.score, at: now(), words: JSON.stringify(article.sections).length > 0 ? undefined : undefined });
    st.board.push({ id: id(), col: "waiting", title: "Залить " + fname + " в репо и в sitemap", desc: "Статья «" + article.title + "» готова, оценка " + qa.score + "/10. Скачайте HTML во вкладке «Статьи», загрузите в GitHub, добавьте URL в sitemap-guides.xml и запросите индексацию в GSC.", agent: "secretary", at: now() });
    st.board.push({ id: id(), col: "queue", title: "Перелинковка: добавить ссылку на новую статью в guides.ru.html", desc: "Добавить карточку «" + article.title + "» в хаб гидов.", agent: "tech", at: now() });
    setAgent(st, "secretary", "done", "Сводка отправлена");
    feed(st, "Секретарь", "Александр", "✅ Смена завершена. Статья «" + article.title + "» (" + fname + ") готова, оценка " + qa.score + "/10. 2 задачи созданы на доске: залить файл + перелинковка.", "report");

    st.shift = { running: false, started: st.shift.started, finished: now(), step: "done", error: null, last: article.title };
    st.stats = st.stats || { shifts: 0 };
    st.stats.shifts++;
    await saveState(store, st);
    return new Response("ok", { status: 200 });
  } catch (e) {
    feed(st, "Система", "Александр", "⚠️ Ошибка смены: " + e.message, "error");
    st.board.push({ id: id(), col: "waiting", title: "Ошибка работы агентов — нужно решение", desc: String(e.message), agent: "system", at: now() });
    st.shift = { running: false, error: String(e.message), finished: now(), step: "error" };
    Object.keys(st.agents).forEach(k => { if (st.agents[k].status === "work") setAgent(st, k, "blocked", "Остановлен из-за ошибки"); });
    await saveState(store, st);
    return new Response("error: " + e.message, { status: 200 });
  }
};

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

function buildHTML(a) {
  const url = "https://norvalio.com/" + a.slug + ".ru.html";
  const d = new Date().toISOString().slice(0, 10);
  const rel = (a.related || []).slice(0, 3).map(sl => {
    const g = GUIDES.filter(x => x[0].indexOf(sl.replace(/\.ru\.html$/, "")) === 0)[0];
    return g ? g : null;
  }).filter(Boolean);
  while (rel.length < 3) rel.push(GUIDES[rel.length]);
  const faqLD = a.faq.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } }));
  const sectionsHTML = a.sections.map(s => "      <h2>" + esc(s.h2) + "</h2>\n      " + s.html).join("\n");
  const faqHTML = a.faq.map(f => '        <div class="qa"><h3>' + esc(f.q) + "</h3><p>" + esc(f.a) + "</p></div>").join("\n");
  const relHTML = rel.map(g => '        <a class="relcard" href="' + g[0] + '"><div class="rk">Гид</div><h3>' + esc(g[1]) + '</h3><span class="lk">Читать →</span></a>').join("\n");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(a.metaTitle)} | Norvalio</title>
<meta name="description" content="${esc(a.metaDesc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ru" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"></noscript>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%228%22%20fill%3D%22%230a0a0f%22%2F%3E%3Cpath%20d%3D%22M10%2023%20V9%20L22%2023%20V9%22%20fill%3D%22none%22%20stroke%3D%22%23ff5d73%22%20stroke-width%3D%223.4%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Norvalio">
<meta property="og:title" content="${esc(a.metaTitle)} | Norvalio">
<meta property="og:description" content="${esc(a.metaDesc)}">
<meta property="og:image" content="https://norvalio.com/og.png">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@type": "Article", "headline": a.title, "description": a.metaDesc, "inLanguage": "ru", "datePublished": d, "dateModified": d, "image": "https://norvalio.com/og.png", "author": { "@type": "Organization", "name": "Norvalio", "url": "https://norvalio.com" }, "publisher": { "@type": "Organization", "name": "Norvalio", "logo": { "@type": "ImageObject", "url": "https://norvalio.com/og.png" } }, "mainEntityOfPage": { "@type": "WebPage", "@id": url } })}
</script>
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faqLD })}
</script>
<style>
  :root{--ink:#0a0a0f;--ink2:#101019;--card:#14141f;--paper:#f4f2ee;--muted:#8b8b99;--soft:#c9c9d3;--line:rgba(255,255,255,.10);--a1:#ff5d73;--a2:#5d8bff;--a3:#b06bff;--disp:"Space Grotesk",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif;--max:1140px}
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth;background-color:#0a0a0f}
  .bg-glow{position:fixed;inset:0;z-index:-2;pointer-events:none;background-repeat:no-repeat;background:radial-gradient(46vw 46vw at 76% 20%,rgba(176,107,255,.20),transparent 68%),radial-gradient(40vw 40vw at 95% 54%,rgba(93,139,255,.16),transparent 70%),radial-gradient(34vw 34vw at 10% 12%,rgba(255,93,115,.12),transparent 72%)}
  @media(max-width:780px){.bg-glow{background:radial-gradient(130vw 130vw at 70% 8%,rgba(176,107,255,.28),transparent 66%),radial-gradient(120vw 120vw at 20% 40%,rgba(255,93,115,.14),transparent 72%)}}
  body{background:transparent;color:var(--paper);font-family:var(--body);overflow-x:hidden;-webkit-font-smoothing:antialiased;line-height:1.6}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:var(--max);margin:0 auto;padding:0 28px;width:100%}
  .rv{opacity:0;transform:translateY(24px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)}
  .rv.in{opacity:1;transform:none}
  .rv.d1{transition-delay:.06s}.rv.d2{transition-delay:.14s}.rv.d3{transition-delay:.24s}
  .nav{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:18px;padding:16px 28px;background:rgba(10,10,15,.72);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
  .brand{font-family:var(--disp);font-weight:700;font-size:19px;letter-spacing:-.02em}
  .brand b{color:var(--a1)}
  .navlinks{display:flex;gap:15px;margin-left:18px;flex-wrap:nowrap}
  .navlinks a{font-size:13.5px;color:var(--soft);transition:.2s;white-space:nowrap}
  .navlinks a:hover{color:var(--paper)}
  .lang{display:flex;gap:2px;margin-left:auto;border:1px solid var(--line);border-radius:999px;padding:3px}
  .lang a{font-family:var(--disp);font-weight:500;font-size:12px;letter-spacing:.04em;padding:5px 10px;border-radius:999px;color:var(--muted);transition:.2s}
  .lang a.on{background:var(--paper);color:var(--ink)}
  .nav .wa{margin-left:12px;font-family:var(--disp);font-weight:500;font-size:14px;background:var(--paper);color:var(--ink);padding:11px 20px;border-radius:999px;border:0;cursor:pointer;transition:transform .15s ease}
  .burger{display:none;width:38px;height:34px;border:1px solid var(--line);border-radius:9px;background:transparent;cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:0;margin-left:10px}
  .burger span{display:block;width:16px;height:1.5px;background:var(--paper);transition:.25s}
  .nav.open .burger span:nth-child(1){transform:translateY(5.5px) rotate(45deg)}
  .nav.open .burger span:nth-child(2){opacity:0}
  .nav.open .burger span:nth-child(3){transform:translateY(-5.5px) rotate(-45deg)}
  @media(max-width:1080px){.nav{flex-wrap:wrap}.burger{display:flex}.navlinks{display:none;flex-basis:100%;flex-direction:column;gap:0;margin:10px 0 2px;order:5}.nav.open .navlinks{display:flex}.navlinks a{padding:13px 2px;border-top:1px solid rgba(255,255,255,.07);font-size:16px}}
  @media(max-width:480px){.wrap{padding:0 18px}}
  .arthero{padding:64px 0 26px}
  .crumb{font-family:var(--disp);font-size:12px;letter-spacing:.06em;color:var(--muted);margin-bottom:20px}
  .eyebrow{font-family:var(--disp);font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--muted);margin-bottom:18px}
  .eyebrow span{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--a1);margin-right:10px;vertical-align:middle}
  h1{font-family:var(--disp);font-weight:700;letter-spacing:-.02em;line-height:1.04;font-size:clamp(30px,5vw,52px);max-width:20ch}
  .artlead{margin-top:22px;max-width:60ch;font-size:clamp(16px,1.7vw,19px);color:var(--soft)}
  .capsule{margin:34px 0 8px;border:1px solid var(--line);border-left:3px solid var(--a2);border-radius:16px;background:rgba(93,139,255,.06);padding:22px 24px}
  .capsule .lab{font-family:var(--disp);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--a2);margin-bottom:10px}
  .capsule p{color:var(--paper);font-size:16px;line-height:1.65}
  .prose{padding:26px 0 10px}
  .prose h2{font-family:var(--disp);font-weight:600;letter-spacing:-.01em;font-size:clamp(24px,3.4vw,34px);line-height:1.1;margin:44px 0 14px}
  .prose h3{font-family:var(--disp);font-weight:600;font-size:20px;margin:28px 0 10px}
  .prose p{color:var(--soft);font-size:16.5px;line-height:1.7;margin:0 0 14px;max-width:70ch}
  .prose ul{margin:0 0 16px;padding-left:0;list-style:none;max-width:70ch}
  .prose ul li{position:relative;padding-left:26px;margin-bottom:10px;color:var(--soft);font-size:16.5px;line-height:1.6}
  .prose ul li::before{content:"";position:absolute;left:4px;top:11px;width:7px;height:7px;border-radius:50%;background:var(--a1)}
  .prose a{color:var(--a2);border-bottom:1px solid rgba(93,139,255,.35)}
  .prose a:hover{color:var(--paper);border-bottom-color:var(--paper)}
  .prose strong{color:var(--paper);font-weight:600}
  .ptable{width:100%;border-collapse:collapse;margin:18px 0 8px;font-size:15.5px;overflow:hidden;border-radius:14px;border:1px solid var(--line)}
  .ptable th,.ptable td{padding:14px 16px;text-align:left;border-bottom:1px solid var(--line)}
  .ptable th{font-family:var(--disp);font-weight:600;color:var(--paper);background:rgba(255,255,255,.04);font-size:14px}
  .ptable td{color:var(--soft)}
  .ptable tr:last-child td{border-bottom:0}
  .faqsec{padding:20px 0 6px}
  .faqsec h2{font-family:var(--disp);font-weight:600;font-size:clamp(24px,3.4vw,34px);margin:24px 0 18px}
  .faqlist{display:flex;flex-direction:column;gap:14px;max-width:820px}
  .qa{padding:20px 22px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.03)}
  .qa h3{font-family:var(--disp);font-size:18px;margin:0 0 8px}
  .qa p{margin:0;line-height:1.65;color:var(--soft)}
  .related{padding:26px 0}
  .related h2{font-family:var(--disp);font-weight:600;font-size:24px;margin-bottom:18px}
  .relgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  @media(max-width:820px){.relgrid{grid-template-columns:1fr}}
  .relcard{border:1px solid var(--line);border-radius:16px;background:rgba(20,20,31,.55);padding:22px;transition:transform .25s,border-color .25s;display:block}
  .relcard:hover{transform:translateY(-4px);border-color:rgba(255,255,255,.22)}
  .relcard .rk{font-family:var(--disp);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--a3);margin-bottom:10px}
  .relcard h3{font-family:var(--disp);font-weight:600;font-size:17px;line-height:1.3}
  .relcard .lk{margin-top:14px;display:inline-block;font-size:13px;color:var(--a2)}
  .final{padding:80px 0 90px;text-align:center}
  .final h2{font-family:var(--disp);font-weight:700;letter-spacing:-.02em;font-size:clamp(28px,5vw,52px);line-height:1.05}
  .final p{margin:20px auto 0;max-width:48ch;color:var(--soft);font-size:17px}
  .cta{margin-top:32px;display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap}
  .btn{font-family:var(--disp);font-weight:500;font-size:15px;padding:15px 26px;border-radius:999px;border:0;cursor:pointer;transition:transform .15s ease,background .2s}
  .btn.primary{background:var(--paper);color:var(--ink)}
  .btn.ghost{background:transparent;color:var(--paper);border:1px solid var(--line)}
  .btn.ghost:hover{border-color:rgba(255,255,255,.32)}
  footer{border-top:1px solid var(--line);padding:46px 0;color:var(--muted);font-size:14px;background:rgba(10,10,15,.66)}
  footer .wrap{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:center}
  footer a{color:var(--soft)}
  .wafab{position:fixed;right:18px;bottom:18px;z-index:90;width:56px;height:56px;border-radius:50%;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(37,211,102,.42);transition:transform .2s}
  .wafab:hover{transform:scale(1.07)}
  .wafab svg{width:30px;height:30px;fill:#fff}
  @media(max-width:480px){.wafab{width:52px;height:52px;right:14px;bottom:14px}}
  @media (prefers-reduced-motion:reduce){.rv{transition:none;opacity:1;transform:none}html{scroll-behavior:auto}}
  @media(max-width:1024px){.nav{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(10,10,15,.93)}.relcard{background:rgba(22,22,33,.92)}}
</style>
</head>
<body>
  <div class="bg-glow"></div>
  <nav class="nav">
    <a class="brand" href="index.ru.html">Norvalio<b>.</b></a>
    <div class="navlinks">
      <a href="websites.ru.html">Разработка сайтов</a>
      <a href="seo.ru.html">SEO-продвижение</a>
      <a href="crm.ru.html">CRM-системы</a>
      <a href="automation.ru.html">Автоматизация бизнеса</a>
      <a href="about.ru.html">О нас</a>
      <a href="faq.ru.html">FAQ</a>
      <a href="offers.ru.html">Предложения</a>
    </div>
    <div class="lang"><a href="index.html">EN</a><a href="${a.slug}.ru.html" class="on">RU</a></div>
    <button class="wa" id="wa-top">Написать в WhatsApp</button>
    <button class="burger" id="burger" aria-label="Меню"><span></span><span></span><span></span></button>
  </nav>

  <section class="arthero">
    <div class="wrap">
      <div class="crumb rv"><a href="index.ru.html">Norvalio</a> · <a href="guides.ru.html">Гиды</a> · Гид для бизнеса</div>
      <div class="eyebrow rv"><span></span>Гид для бизнеса в ОАЭ</div>
      <h1 class="rv d1">${esc(a.title)}</h1>
      <p class="artlead rv d2">${esc(a.lead)}</p>
      <div class="capsule rv d3">
        <div class="lab">Краткий ответ</div>
        <p>${esc(a.capsule)}</p>
      </div>
    </div>
  </section>

  <section class="prose">
    <div class="wrap">
${sectionsHTML}
    </div>
  </section>

  <section class="faqsec">
    <div class="wrap">
      <h2>Частые вопросы</h2>
      <div class="faqlist">
${faqHTML}
      </div>
    </div>
  </section>

  <section class="related">
    <div class="wrap">
      <h2>Читайте также</h2>
      <div class="relgrid">
${relHTML}
      </div>
    </div>
  </section>

  <section class="final">
    <div class="wrap">
      <h2>Нужен сайт, который приводит клиентов?</h2>
      <p>Обсудим вашу задачу и предложим решение с ценой — бесплатно, в WhatsApp, на русском.</p>
      <div class="cta">
        <button class="btn primary" id="wa-cta">Обсудить проект в WhatsApp</button>
        <a class="btn ghost" href="guides.ru.html">Все гиды</a>
      </div>
    </div>
  </section>

  <footer>
    <div class="wrap">
      <div>© Norvalio, Дубай, ОАЭ</div>
      <div><a href="guides.ru.html">Гиды</a> · <a href="offers.ru.html">Предложения</a> · <a href="faq.ru.html">FAQ</a></div>
    </div>
  </footer>

  <a class="wafab" id="wa-fab" href="#" aria-label="WhatsApp"><svg viewBox="0 0 32 32"><path d="M16 2.9C8.8 2.9 3 8.7 3 15.9c0 2.3.6 4.5 1.7 6.5L3 29.1l6.9-1.8c1.9 1 4 1.6 6.1 1.6 7.2 0 13-5.8 13-13S23.2 2.9 16 2.9zm0 23.7c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.1 1.1-4-.3-.4c-1.1-1.7-1.6-3.7-1.6-5.7 0-5.9 4.8-10.7 10.7-10.7S26.7 10 26.7 15.9 21.9 26.6 16 26.6zm5.9-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2.1-.4 0-.6-.1-.2-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.6h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.4c.2.2 2.3 3.5 5.6 4.9.8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg></a>

  <script>
  (function(){
    var WA="https://wa.me/971568178590?text="+encodeURIComponent("Здравствуйте! Прочитал(а) гид «${esc(a.title)}» — хочу обсудить проект.");
    function wa(){window.open(WA,"_blank")}
    var ids=["wa-top","wa-cta"];for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el)el.addEventListener("click",wa)}
    var fab=document.getElementById("wa-fab");if(fab)fab.setAttribute("href",WA);
    var burger=document.getElementById("burger"),nav=document.querySelector(".nav");
    if(burger)burger.addEventListener("click",function(){nav.classList.toggle("open")});
    var els=document.querySelectorAll(".rv");
    if("IntersectionObserver" in window){
      var io=new IntersectionObserver(function(es){for(var j=0;j<es.length;j++){if(es[j].isIntersecting){es[j].target.classList.add("in");io.unobserve(es[j].target)}}},{threshold:.12});
      for(var k=0;k<els.length;k++)io.observe(els[k]);
    } else { for(var m=0;m<els.length;m++)els[m].classList.add("in"); }
  })();
  </script>
</body>
</html>`;
}
