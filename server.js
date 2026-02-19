// ========================================================
// Aviator Monitor Bot - PremierBet 24/7 (ULTRA HUMANIZADO 2026)
// Delays de 8-13 segundos entre CADA ação + movimentos humanos reais
// Mouse curve + typing lento + scroll random + stealth extra
// ========================================================

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const express = require('express');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 3000;

// ────────────────────────────────────────────────
// CONFIGS
// ────────────────────────────────────────────────
const TELEGRAM_TOKEN = '8583470384:AAF0poQRbfGkmGy7cA604C4b_-MhYj-V7XM';
const CHAT_ID = '7427648935';

const TELEFONE = '857789345';
const SENHA = 'max123ZICO';

const URL_AVIATOR = 'https://www.premierbet.co.mz/virtuals/game/aviator-291195';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

let browser;
let page;
let historicoAntigo = new Set();
let multiplicadores = [];

// ────────────────────────────────────────────────
// HUMANIZAÇÃO PESADA (8-13s entre ações)
// ────────────────────────────────────────────────
async function humanDelay(min = 8000, max = 13000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`[HUMAN] Esperando ${Math.floor(delay/1000)} segundos pra parecer humano...`);
  await new Promise(r => setTimeout(r, delay));
}

async function randomMouseMove() {
  try {
    const x = 100 + Math.random() * 900;
    const y = 100 + Math.random() * 500;
    await page.mouse.move(x, y, { steps: 25 }); // movimento curvado natural
    console.log(`[HUMAN] Mouse movido pra (${x.toFixed(0)}, ${y.toFixed(0)})`);
  } catch(e) {}
}

async function humanType(selector, text) {
  await page.waitForSelector(selector, { visible: true });
  await randomMouseMove();
  await page.click(selector);
  await page.type(selector, text, { delay: 80 + Math.random() * 120 }); // digitação humana
  console.log(`[HUMAN] Digitado: ${text}`);
}

async function humanClick(selector) {
  await page.waitForSelector(selector, { visible: true });
  await randomMouseMove();
  const box = await page.$(selector);
  const { x, y, width, height } = await box.boundingBox();
  await page.mouse.move(x + width/2 + (Math.random()*20-10), y + height/2 + (Math.random()*20-10), { steps: 30 });
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 80 + Math.random()*120));
  await page.mouse.up();
  console.log(`[HUMAN] Click humano no botão`);
}

// ────────────────────────────────────────────────
// PRINT + TELEGRAM
// ────────────────────────────────────────────────
async function tirarPrint(nome) {
  try {
    const caminho = `/tmp/${nome}.png`;
    await page.screenshot({ path: caminho });
    await bot.sendPhoto(CHAT_ID, fs.createReadStream(caminho), { 
      caption: `📸 ${nome} - ${new Date().toLocaleTimeString('pt-BR')}` 
    });
    fs.unlinkSync(caminho);
    console.log(`[PRINT] Enviado: ${nome}`);
  } catch(e) {}
}

// ────────────────────────────────────────────────
// OUTRAS FUNÇÕES
// ────────────────────────────────────────────────
async function enviarTelegram(mensagem) {
  try {
    await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });
  } catch (err) { console.error('[TELEGRAM ERRO]', err.message); }
}

async function getIframeFrame() {
  try {
    const iframeElement = await page.waitForSelector('iframe', { timeout: 30000 });
    const frame = await iframeElement.contentFrame();
    return frame;
  } catch (err) {
    console.error('[IFRAME ERRO]', err.message);
    return null;
  }
}

// ────────────────────────────────────────────────
// BOT PRINCIPAL
// ────────────────────────────────────────────────
async function iniciarBot() {
  try {
    console.log('[BOT] Iniciando Aviator Monitor ULTRA HUMANIZADO...');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1366,768',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      ignoreHTTPSErrors: true
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
    });

    console.log(`[BOT] Abrindo PremierBet...`);
    await page.goto(URL_AVIATOR, { waitUntil: 'networkidle2', timeout: 90000 });
    await humanDelay(10000, 15000);
    await tirarPrint('1-Site-Carregado');

    // ── LOGIN ULTRA LENTO ──
    console.log('[LOGIN] Iniciando login humano...');

    await humanDelay(8000, 12000);
    await humanType('input[name="login"]', TELEFONE);
    await tirarPrint('2-Telefone-Digitado');
    await humanDelay(10000, 14000);

    await humanType('input[name="password"]', SENHA);
    await tirarPrint('3-Senha-Digitada');
    await humanDelay(10000, 14000);

    await humanClick('button.form-button.form-button--primary');
    await tirarPrint('4-Login-Clicado');

    // Espera o jogo carregar (bem lenta)
    await humanDelay(15000, 20000);
    await page.waitForSelector('iframe', { timeout: 120000 });
    await humanDelay(12000, 18000);

    const frame = await getIframeFrame();
    await tirarPrint('5-Login-Sucesso-Iframe-Carregado');

    if (!frame) throw new Error('Iframe não apareceu');

    enviarTelegram('🤖 Bot logado na **PremierBet** com HUMANIZAÇÃO PESADA! 🔥\nSite não vai mais detectar bot! 📸 Prints enviados.');

    // ── LOOP MONITORAMENTO (também humanizado)
    setInterval(async () => {
      try {
        const frameAtual = await getIframeFrame();
        if (!frameAtual) return;

        const payouts = await frameAtual.$$eval(
          '.payouts-block .payout.ng-star-inserted',
          els => els.map(el => el.innerText.trim()).filter(t => t && t.endsWith('x'))
        );

        const novos = [];
        payouts.forEach(texto => {
          const valor = parseFloat(texto.replace('x','').trim().replace(',','.'));
          if (!isNaN(valor)) {
            const key = valor.toFixed(2);
            if (!historicoAntigo.has(key)) {
              historicoAntigo.add(key);
              const ts = new Date().toISOString().replace('T',' ').substring(0,19);
              multiplicadores.push({ timestamp: ts, valor });
              novos.push(valor);

              let msg = `🕒 ${ts} | <b>${valor.toFixed(2)}x</b>`;
              if (valor >= 50) msg = `🚀 FOGUETÃO INSANO! ${valor.toFixed(2)}x 🚀\n${msg}`;
              else if (valor >= 10) msg = `🔥 BOA! ${valor.toFixed(2)}x 🔥\n${msg}`;
              enviarTelegram(msg);
            }
          }
        });

        if (novos.length > 0) {
          fs.writeFileSync('historico.json', JSON.stringify(multiplicadores, null, 2));
        }

      } catch (err) { console.error('[ERRO loop]', err.message); }
    }, 12000); // loop também mais espaçado

  } catch (err) {
    console.error('[ERRO FATAL]', err.message);
    await tirarPrint('ERRO-FATAL');
    if (browser) await browser.close();
  }
}

// ── SERVER ──
app.get('/', (req, res) => {
  res.send(`<h1>Aviator PremierBet - ULTRA HUMANIZADO</h1><p>Status: Rodando</p><p>Capturados: ${multiplicadores.length}</p>`);
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  iniciarBot();
});

process.on('SIGTERM', async () => {
  console.log('Fechando browser...');
  if (browser) await browser.close();
  process.exit(0);
});
