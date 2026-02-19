// ========================================================
// Aviator Betway - FINAL COM DOIS FORMULÁRIOS + DELAY 10S + CLIQUE MODAL SUBMIT
// Preenche header → clica → espera modal → preenche modal → clica submit do modal
// ========================================================

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const express = require('express');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 8080;

// CONFIGURAÇÕES
const TELEGRAM_TOKEN = "8583470384:AAF0poQRbfGkmGy7cA604C4b_-MhYj-V7XM";
const CHAT_ID = "7427648935";
const TELEFONE = "857789345";
const SENHA = "max123ZICO";
const URL_AVIATOR = 'https://www.betway.co.mz/lobby/instant%20games/game/aviator?vertical=instantgames';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

let browser;
let page;
let historicoAntigo = new Set();
let historicoAtual = [];
const MAX_HISTORICO = 20;

let multiplicadores = [];

// FUNÇÕES AUXILIARES
async function enviarTelegram(mensagem) {
  try {
    await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });
  } catch (err) {}
}

async function enviarScreenshot(caption) {
  try {
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    await bot.sendPhoto(CHAT_ID, Buffer.from(screenshot, 'base64'), { caption });
    console.log('[SCREENSHOT]', caption);
  } catch (e) {}
}

async function delay(segundos = 10) {
  console.log(`[DELAY] Esperando ${segundos}s...`);
  await new Promise(r => setTimeout(r, segundos * 1000));
}

// INÍCIO DO BOT
async function iniciarBot() {
  try {
    console.log('[BOT] Iniciando Betway Aviator...');

    browser = await puppeteer.launch({
      headless: 'new',
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--window-size=1024,768',
        '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      ],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });

    console.log('[BOT] Carregando página...');
    await page.goto(URL_AVIATOR, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await enviarScreenshot('📸 Página inicial carregada');
    await delay(10);

    // PRIMEIRO FORMULÁRIO (HEADER)
    console.log('[LOGIN HEADER] Preenchendo...');
    await page.waitForSelector('#header-username', { timeout: 120000, visible: true });
    await page.type('#header-username', TELEFONE);
    await enviarScreenshot('📸 Telefone preenchido header');
    await delay(10);

    await page.waitForSelector('#header-password', { timeout: 120000, visible: true });
    await page.type('#header-password', SENHA);
    await enviarScreenshot('📸 Senha preenchida header');
    await delay(10);

    await page.waitForSelector('#login-btn', { timeout: 60000, visible: true });
    await page.click('#login-btn');
    await enviarScreenshot('📸 Botão header clicado');
    await delay(10);

    // SEGUNDO FORMULÁRIO (MODAL)
    console.log('[LOGIN MODAL] Esperando modal...');
    await page.waitForSelector('#login-mobile', { timeout: 120000, visible: true });
    await page.type('#login-mobile', TELEFONE);
    await enviarScreenshot('📸 Telefone preenchido modal');
    await delay(10);

    await page.waitForSelector('#login-password', { timeout: 120000, visible: true });
    await page.type('#login-password', SENHA);
    await enviarScreenshot('📸 Senha preenchida modal');
    await delay(10);

    // CLIQUE NO BOTÃO SUBMIT DO MODAL
    console.log('[LOGIN MODAL] Clicando Entrar do modal...');
    await page.waitForSelector('button[type="submit"]', { timeout: 60000, visible: true });
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });
    await enviarScreenshot('📸 Botão modal Entrar clicado (submit)');
    await delay(10);

    // Espera jogo/histórico
    console.log('[FINAL] Esperando histórico...');
    await page.waitForSelector('.payouts-block .payout.ng-star-inserted', { timeout: 180000 });
    await enviarScreenshot('📸 Pós-login - Histórico visível!');

    enviarTelegram('🤖 Logado na Betway! Monitorando 🔥');

    // LOOP
    setInterval(async () => {
      try {
        const payouts = await page.$$eval(
          '.payouts-block .payout.ng-star-inserted',
          els => els.map(el => el.innerText.trim()).filter(t => t && t.endsWith('x'))
        );

        let atualizou = false;

        payouts.forEach(texto => {
          const valor = parseFloat(texto.replace('x', '').replace(',', '.'));
          if (isNaN(valor)) return;

          const key = valor.toFixed(2);
          if (!historicoAntigo.has(key)) {
            historicoAntigo.add(key);
            historicoAtual.unshift(valor.toFixed(2));
            if (historicoAtual.length > MAX_HISTORICO) historicoAtual.pop();
            atualizou = true;
          }
        });

        if (atualizou) {
          console.log(`[ARRAY] Atualizado: ${historicoAtual.length}`);
          enviarTelegram(`Novos multiplicadores! Últimos: ${historicoAtual.slice(0,5).join(', ')}`);
        }

      } catch (err) {}
    }, 8000);

  } catch (err) {
    console.error('[FATAL]', err.message);
    await enviarScreenshot('💥 ERRO FINAL');
    if (browser) await browser.close();
    process.exit(1);
  }
}

// ENDPOINTS
app.get('/health', (req, res) => res.status(200).send('✅ ONLINE'));
app.get('/historico', (req, res) => res.json({ historicoAtual }));
app.get('/', (req, res) => res.send(`<h1>Betway Aviator Monitor</h1><p>Histórico atual: ${JSON.stringify(historicoAtual)}</p>`));

app.listen(port, () => {
  console.log(`🚀 Rodando porta ${port}`);
  setTimeout(() => iniciarBot().catch(console.error), 10000);
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
