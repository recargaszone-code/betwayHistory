// ========================================================
// Aviator Monitor Bot - PremierBet 24/7 (MATANDO O MODAL DE VEZ)
// Fecha popup promoções ANTES do login + delays apertados ~10s
// ========================================================

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const express = require('express');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 3000;

// CONFIGS
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

// ── HUMAN DELAY APERTADO (~8-12s) ──
async function humanDelay(min = 6000, max = 12000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`[HUMAN] Esperando ${Math.round(delay/1000)}s...`);
  await new Promise(r => setTimeout(r, delay));
}

// ── MOVIMENTO MOUSE + SCROLL RANDOM ──
async function humanInteract() {
  try {
    const x = 200 + Math.random() * 800;
    const y = 200 + Math.random() * 400;
    await page.mouse.move(x, y, { steps: 15 });
    await page.evaluate(() => window.scrollBy(0, Math.random() * 100 - 50));
  } catch(e) {}
}

// ── PRINT ──
async function tirarPrint(nome) {
  try {
    const caminho = `/tmp/${nome.replace(/\s/g, '-')}.png`;
    await page.screenshot({ path: caminho, fullPage: true });
    await bot.sendPhoto(CHAT_ID, fs.createReadStream(caminho), {
      caption: `📸 ${nome}`
    });
    fs.unlinkSync(caminho);
  } catch (e) {}
}

// ── FECHAR MODAL PROMOÇÕES (AGRESSIVO) ──
async function killModal() {
  console.log('[MODAL KILLER] Atacando o popup...');
  await humanDelay(3000, 6000);
  await humanInteract();

  // Tenta por texto exato "MAIS TARDE"
  try {
    const maisTarde = await page.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('button, div, span, p'));
      return els.find(el => el.innerText.toLowerCase().includes('mais tarde'));
    }, { timeout: 10000 });

    if (maisTarde) {
      const box = await maisTarde.boundingBox();
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
      console.log('[MODAL] Clicou em MAIS TARDE!');
      await humanDelay(3000, 6000);
      await tirarPrint('MODAL FECHADO - Mais Tarde Clicado');
      return true;
    }
  } catch(e) {}

  // Fallback: clica fora do modal (canto superior)
  console.log('[MODAL] Tentativa 2: Clique fora');
  await page.mouse.click(50, 50);
  await humanDelay(4000, 7000);
  await tirarPrint('MODAL TENTATIVA 2 - Clique Fora');

  // Verifica se sumiu
  const aindaTem = await page.evaluate(() => document.body.innerText.includes('promoções') || document.body.innerText.includes('ACEITO'));
  if (aindaTem) {
    console.log('[MODAL] Ainda tá aí... tentando de novo');
    await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"], .modal, [aria-modal="true"]');
      if (modal) modal.remove();
    });
    await tirarPrint('MODAL FORÇADO REMOVIDO - JS');
  }
}

// ── BOT PRINCIPAL ──
async function iniciarBot() {
  try {
    console.log('[BOT] Iniciando anti-modal pesado...');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(URL_AVIATOR, { waitUntil: 'networkidle2', timeout: 60000 });
    await tirarPrint('1 - Página Inicial Carregada');

    // MATAR MODAL LOGO NO COMEÇO
    await killModal();

    // LOGIN
    await humanDelay(5000, 9000);
    await page.type('input[name="login"]', TELEFONE, { delay: 100 });
    await tirarPrint('2 - Telefone Digitado');
    await humanDelay(6000, 10000);

    await page.type('input[name="password"]', SENHA, { delay: 100 });
    await tirarPrint('3 - Senha Digitada');
    await humanDelay(5000, 9000);

    await page.click('button.form-button.form-button--primary');
    await tirarPrint('4 - Botão Login Clicado');

    await humanDelay(12000, 18000);
    await killModal(); // tenta fechar de novo pós-clique

    await page.waitForSelector('iframe', { timeout: 90000 }).catch(() => {});
    await tirarPrint('5 - Pós-Login (esperando iframe)');

    const frame = await page.$('iframe')?.then(el => el.contentFrame());
    if (frame) {
      await tirarPrint('6 - Aviator Carregado com Sucesso!');
      enviarTelegram('🤖 Modal morto! Login feito! 🔥 Aviator rodando.');
    } else {
      await tirarPrint('ERRO - Ainda sem iframe (modal fodeu?)');
      throw new Error('Iframe não apareceu');
    }

    // LOOP (simplificado)
    setInterval(async () => {
      try {
        const f = await page.$('iframe')?.contentFrame();
        if (!f) return;
        // teu código de payouts aqui...
      } catch(e) {}
    }, 10000);

  } catch (err) {
    console.error('[FATAL]', err.message);
    await tirarPrint('ERRO-FATAL');
  }
}

app.get('/', (req, res) => res.send('<h1>Bot rodando</h1>'));
app.listen(port, () => {
  console.log(`Porta ${port}`);
  iniciarBot();
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
