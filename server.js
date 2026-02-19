// ========================================================
// Aviator Betway - FINAL ATUALIZADO 2026 (SELETORES NOVOS: login-mobile, login-password, submit)
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
        '--disable-gpu',
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
    await enviarScreenshot('📸 Página inicial carregada');

    // LOGIN COM RETRY - SELETORES NOVOS
    console.log('[LOGIN] Iniciando...');
    let tentativas = 0;
    while (tentativas < 3) {
      try {
        console.log('[LOGIN] Esperando #login-mobile...');
        await page.waitForSelector('#login-mobile', { timeout: 120000, visible: true });
        await page.type('#login-mobile', TELEFONE);
        await enviarScreenshot('📸 Telefone digitado (#login-mobile)');

        console.log('[LOGIN] Esperando #login-password...');
        await page.waitForSelector('#login-password', { timeout: 120000, visible: true });
        await page.type('#login-password', SENHA);
        await enviarScreenshot('📸 Senha digitada (#login-password)');

        console.log('[LOGIN] Clicando botão Entrar (type=submit)...');
        await page.waitForSelector('button[type="submit"]', { timeout: 60000, visible: true });
        await page.click('button[type="submit"]');
        await enviarScreenshot('📸 Botão Entrar clicado (submit)');

        // Espera histórico aparecer (classe payouts-block ou elemento com 'x')
        console.log('[LOGIN] Esperando histórico...');
        await page.waitForSelector('.payouts-block .payout, [class*="multiplier"], [class*="payout"]', { timeout: 180000 });
        await enviarScreenshot('📸 Histórico detectado pós-login');

        enviarTelegram('🤖 Logado na Betway! Monitorando histórico 🔥');
        break;
      } catch (e) {
        tentativas++;
        console.error(`[LOGIN] Falha tentativa ${tentativas}:`, e.message);
        await enviarScreenshot(`❌ Falha tentativa ${tentativas}`);
        await new Promise(r => setTimeout(r, 15000));
      }
    }

    if (tentativas >= 3) throw new Error('Login falhou após 3 tentativas');

    // LOOP PRINCIPAL - CAPTURA DIRETA
    setInterval(async () => {
      try {
        console.log('[LOOP] Capturando multiplicadores...');

        const payouts = await page.$$eval(
          '.payouts-block .payout.ng-star-inserted, .payout, [class*="multiplier"], [class*="payout"]',
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
            console.log(`[NOVO] ${valor.toFixed(2)}x encontrado`);
          }
        });

        if (atualizou) {
          fs.writeFileSync('historico.json', JSON.stringify(multiplicadores, null, 2));
          console.log(`[ARRAY] Atualizado: ${historicoAtual.length}`);
          enviarTelegram(`Atualizado! Últimos 5: ${historicoAtual.slice(0,5).join(', ')}`);
        }

        // Screenshot aleatório pra debug
        if (Math.random() < 0.1) await enviarScreenshot('📸 Debug loop');

      } catch (err) {
        console.error('[LOOP ERRO]', err.message);
      }
    }, 8000);

  } catch (err) {
    console.error('[FATAL]', err.message);
    await enviarScreenshot('💥 ERRO FATAL');
    if (browser) await browser.close();
    process.exit(1);
  }
}

// ENDPOINTS
app.get('/health', (req, res) => res.status(200).send('✅ ONLINE'));
app.get('/historico', (req, res) => res.json({ historicoAtual }));
app.get('/', (req, res) => res.send(`<h1>Betway Aviator</h1><p>Histórico: ${JSON.stringify(historicoAtual)}</p>`));

app.listen(port, () => {
  console.log(`🚀 Rodando porta ${port}`);
  setTimeout(() => iniciarBot().catch(console.error), 10000);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Fechando');
  if (browser) await browser.close();
  process.exit(0);
});
