// ========================================================
// Aviator Betway - FINAL 2026 (SEM IFRAME, SELETOR DIRETO NO HTML)
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
    console.log('[TELEGRAM]', mensagem);
  } catch (err) {}
}

async function enviarScreenshot(caption) {
  try {
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    await bot.sendPhoto(CHAT_ID, Buffer.from(screenshot, 'base64'), { caption });
    console.log('[SCREENSHOT] Enviado:', caption);
  } catch (e) {}
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
        '--disable-gpu', // tenta sem GPU primeiro
        '--no-zygote',
        '--single-process',
        '--disable-web-security',
        '--window-size=1024,768',
        '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      ],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });

    console.log('[BOT] Abrindo URL...');
    await page.goto(URL_AVIATOR, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await enviarScreenshot('📸 Página inicial');

    // LOGIN
    console.log('[LOGIN] Iniciando...');
    let tentativas = 0;
    while (tentativas < 3) {
      try {
        await page.waitForSelector('#header-username', { timeout: 120000, visible: true });
        await page.type('#header-username', TELEFONE);
        await enviarScreenshot('📸 Telefone digitado');

        await page.waitForSelector('#header-password', { timeout: 120000, visible: true });
        await page.type('#header-password', SENHA);
        await enviarScreenshot('📸 Senha digitada');

        await page.waitForSelector('#login-btn', { timeout: 60000, visible: true });
        await page.click('#login-btn');
        await enviarScreenshot('📸 Botão Entrar clicado');

        // Espera o histórico aparecer (elemento com 'x' ou classe payouts-block)
        await page.waitForSelector('.payouts-block .payout', { timeout: 180000 });
        await enviarScreenshot('📸 Histórico detectado!');

        enviarTelegram('🤖 Logado na Betway! Monitorando agora 🔥');
        break;
      } catch (e) {
        tentativas++;
        console.error(`[LOGIN] Falha ${tentativas}:`, e.message);
        await enviarScreenshot(`❌ Falha tentativa ${tentativas}`);
        await new Promise(r => setTimeout(r, 15000));
      }
    }

    if (tentativas >= 3) throw new Error('Login falhou após 3 tentativas');

    // LOOP PRINCIPAL - SELETOR DIRETO
    setInterval(async () => {
      try {
        console.log('[LOOP] Capturando payouts...');

        const payouts = await page.$$eval(
          '.payouts-block .payout.ng-star-inserted',
          els => els.map(el => el.innerText.trim()).filter(t => t && t.endsWith('x'))
        );

        let atualizou = false;

        payouts.forEach(texto => {
          const valorStr = texto.replace('x', '').trim().replace(',', '.');
          const valor = parseFloat(valorStr);
          if (isNaN(valor)) return;

          const key = valor.toFixed(2);
          if (!historicoAntigo.has(key)) {
            historicoAntigo.add(key);
            multiplicadores.push({ timestamp: new Date().toISOString().slice(0,19), valor });

            historicoAtual.unshift(valor.toFixed(2));
            if (historicoAtual.length > MAX_HISTORICO) historicoAtual.pop();

            atualizou = true;
            console.log(`[NOVO] ${valor.toFixed(2)}x`);
          }
        });

        if (atualizou) {
          fs.writeFileSync('historico.json', JSON.stringify(multiplicadores, null, 2));
          console.log(`[ARRAY] Atualizado: ${historicoAtual.length}`);
          enviarTelegram(`Atualizado! Últimos: ${historicoAtual.slice(0,5).join(', ')}`);
        }

        // Screenshot periódico pra debug
        if (Math.random() < 0.2) await enviarScreenshot('📸 Debug periódico');

      } catch (err) {
        console.error('[LOOP ERRO]', err.message);
      }
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
app.get('/', (req, res) => res.send(`<h1>Betway Monitor</h1><p>Atual: ${JSON.stringify(historicoAtual)}</p>`));

app.listen(port, () => {
  console.log(`🚀 Rodando porta ${port}`);
  setTimeout(() => iniciarBot().catch(console.error), 10000);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Fechando');
  if (browser) await browser.close();
  process.exit(0);
});
