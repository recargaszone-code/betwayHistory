// ========================================================
// Aviator Monitor Bot - PremierBet 24/7 Render Ready (Chrome fix 2026)
// ========================================================

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const express = require('express');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { execSync } = require('child_process');

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
// FUNÇÕES
// ────────────────────────────────────────────────
async function enviarTelegram(mensagem) {
  try { await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' }); console.log('[TELEGRAM] Enviado'); }
  catch (err) { console.error('[TELEGRAM ERRO]', err.message); }
}

async function getIframeFrame() {
  try {
    const iframeElement = await page.waitForSelector('iframe', { timeout: 15000 });
    const frame = await iframeElement.contentFrame();
    if (!frame) throw new Error('ContentFrame não acessível');
    return frame;
  } catch (err) {
    console.error('[IFRAME ERRO]', err.message);
    return null;
  }
}

// ────────────────────────────────────────────────
// BOT
// ────────────────────────────────────────────────
async function iniciarBot() {
  try {
    console.log('[BOT] Iniciando Aviator Monitor com Stealth...');

    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome';
    console.log(`[DEBUG] Tentando Chrome em: ${chromePath}`);

    // DEBUG FORÇADO - mostra se o Chrome realmente existe
    if (fs.existsSync(chromePath)) {
      console.log(`[DEBUG] ✅ Chrome encontrado! Versão: ${execSync(`${chromePath} --version`).toString().trim()}`);
    } else {
      console.error(`[DEBUG] ❌ Chrome NÃO encontrado em ${chromePath}`);
      console.log('[DEBUG] O que tem em /usr/bin/*chrome*:');
      try { console.log(execSync('ls /usr/bin/*chrome* 2>/dev/null || echo "nenhum"').toString()); } catch(e){}
    }

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: chromePath,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--window-size=1280,800','--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
      ignoreHTTPSErrors: true
    });

    page = await browser.newPage();
    console.log(`[BOT] Abrindo: ${URL_AVIATOR}`);
    await page.goto(URL_AVIATOR, { waitUntil: 'networkidle2', timeout: 90000 });

    // LOGIN PREMIERBET
    console.log('[LOGIN] Iniciando...');
    await page.waitForSelector('input[name="login"]', { timeout: 40000, visible: true });
    await page.type('input[name="login"]', TELEFONE);
    await page.waitForSelector('input[name="password"]', { timeout: 20000, visible: true });
    await page.type('input[name="password"]', SENHA);
    await page.waitForSelector('button.form-button.form-button--primary', { timeout: 15000, visible: true });
    await page.click('button.form-button.form-button--primary');

    await page.waitForSelector('iframe', { timeout: 90000 });
    await new Promise(r => setTimeout(r, 10000));

    let frame = await getIframeFrame();
    if (!frame) throw new Error('Iframe não carregou');

    enviarTelegram('🤖 Bot logado na **PremierBet** e monitorando histórico REAL do Aviator! 🔥');

    // LOOP
    setInterval(async () => {
      try {
        frame = await getIframeFrame();
        if (!frame) return;

        const payouts = await frame.$$eval('.payouts-block .payout.ng-star-inserted', els => 
          els.map(el => el.innerText.trim()).filter(t => t && t.endsWith('x'))
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

        if (novos.length > 0) fs.writeFileSync('historico.json', JSON.stringify(multiplicadores, null, 2));

      } catch (err) { console.error('[ERRO loop]', err.message); }
    }, 8000);

  } catch (err) {
    console.error('[ERRO FATAL]', err.message);
    if (browser) await browser.close();
  }
}

// SERVER
app.get('/', (req, res) => {
  res.send(`<h1>Aviator PremierBet</h1><p>Status: Rodando</p><p>Capturados: ${multiplicadores.length}</p>`);
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  iniciarBot();
});

process.on('SIGTERM', async () => { if (browser) await browser.close(); process.exit(0); });
