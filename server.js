// ========================================================
// Aviator Monitor Bot - PremierBet 24/7 (COM PRINTS NO TELEGRAM)
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
// FUNÇÃO DE PRINT + ENVIO PRO TELEGRAM
// ────────────────────────────────────────────────
async function tirarPrint(nome) {
  try {
    const caminho = `/tmp/${nome}.png`;
    await page.screenshot({ path: caminho, fullPage: false });
    await bot.sendPhoto(CHAT_ID, fs.createReadStream(caminho), { 
      caption: `📸 ${nome} - ${new Date().toLocaleTimeString('pt-BR')}` 
    });
    fs.unlinkSync(caminho); // apaga pra não encher disco
    console.log(`[PRINT] Enviado: ${nome}`);
  } catch (e) {
    console.error('[PRINT ERRO]', e.message);
  }
}

// ────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ────────────────────────────────────────────────
async function enviarTelegram(mensagem) {
  try {
    await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });
    console.log('[TELEGRAM] Enviado');
  } catch (err) { console.error('[TELEGRAM ERRO]', err.message); }
}

async function getIframeFrame() {
  try {
    const iframeElement = await page.waitForSelector('iframe', { timeout: 20000 });
    const frame = await iframeElement.contentFrame();
    if (!frame) throw new Error('ContentFrame não acessível');
    console.log('[IFRAME] Re-pego com sucesso!');
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

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      ],
      ignoreHTTPSErrors: true,
      dumpio: true,
      pipe: true
    });

    console.log('[BOT] ✅ Chromium carregado com sucesso!');

    page = await browser.newPage();

    console.log(`[BOT] Abrindo: ${URL_AVIATOR}`);
    await page.goto(URL_AVIATOR, { waitUntil: 'networkidle2', timeout: 90000 });
    await tirarPrint('1-Site Carregado');

    // ── LOGIN PREMIERBET ──
    console.log('[LOGIN] Iniciando login automático...');

    await page.waitForSelector('input[name="login"]', { timeout: 40000, visible: true });
    await page.type('input[name="login"]', TELEFONE);
    await tirarPrint('2-Telefone Digitado');

    await page.waitForSelector('input[name="password"]', { timeout: 20000, visible: true });
    await page.type('input[name="password"]', SENHA);
    await tirarPrint('3-Senha Digitada');

    await page.waitForSelector('button.form-button.form-button--primary', { timeout: 15000, visible: true });
    await page.click('button.form-button.form-button--primary');
    await tirarPrint('4-Login Clicado');

    console.log('[LOGIN] Esperando jogo carregar...');
    await page.waitForSelector('iframe', { timeout: 90000 });
    await new Promise(resolve => setTimeout(resolve, 15000)); // espera mais pra PremierBet

    let frame = await getIframeFrame();
    await tirarPrint('5-Login Sucesso - Iframe Carregado');

    if (!frame) throw new Error('Iframe não carregou');

    enviarTelegram('🤖 Bot logado na **PremierBet** com sucesso! 🔥\n📸 Todos os prints enviados no Telegram.');

    // ── LOOP MONITORAMENTO ──
    setInterval(async () => {
      try {
        frame = await getIframeFrame();
        if (!frame) return;

        const payouts = await frame.$$eval(
          '.payouts-block .payout.ng-star-inserted',
          els => els.map(el => el.innerText.trim()).filter(t => t && t.endsWith('x'))
        );

        const novos = [];
        payouts.forEach(texto => {
          const valorStr = texto.replace('x', '').trim().replace(',', '.');
          const valor = parseFloat(valorStr);
          if (!isNaN(valor)) {
            const key = valor.toFixed(2);
            if (!historicoAntigo.has(key)) {
              historicoAntigo.add(key);
              const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
              multiplicadores.push({ timestamp, valor });
              novos.push(valor);

              let msg = `🕒 ${timestamp} | <b>${valor.toFixed(2)}x</b>`;
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
    }, 8000);

  } catch (err) {
    console.error('[ERRO FATAL]', err.message);
    await tirarPrint('ERRO-FATAL');
    if (browser) await browser.close();
  }
}

// ── SERVER ──
app.get('/', (req, res) => {
  res.send(`<h1>Aviator PremierBet - COM PRINTS</h1><p>Status: Rodando</p><p>Capturados: ${multiplicadores.length}</p>`);
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
