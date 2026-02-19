// ========================================================
// Aviator Betway - RAILWAY 24/7 (ARRAY ROLANTE + API ENDPOINT)
// Seletores atualizados 2026 - header-username, header-password, login-btn
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
let historicoAtual = [];        // ARRAY ROLANTE
const MAX_HISTORICO = 20;

let multiplicadores = [];

// FUNÇÕES AUXILIARES
async function enviarTelegram(mensagem) {
  try {
    await bot.sendMessage(CHAT_ID, mensagem, { parse_mode: 'HTML' });
    console.log('[TELEGRAM] Enviado');
  } catch (err) {
    console.error('[TELEGRAM ERRO]', err.message);
  }
}

async function enviarScreenshot(caption = '📸 Screenshot') {
  try {
    const screenshot = await page.screenshot({ encoding: 'base64' });
    await bot.sendPhoto(CHAT_ID, Buffer.from(screenshot, 'base64'), { caption });
    console.log('[DEBUG] Screenshot enviado');
  } catch (e) {
    console.error('[SCREENSHOT ERRO]', e.message);
  }
}

async function getIframeFrame() {
  try {
    const iframeElement = await page.waitForSelector('iframe', { timeout: 30000 });
    const frame = await iframeElement.contentFrame();
    console.log('[IFRAME] Re-pego!');
    return frame;
  } catch (err) {
    console.error('[IFRAME ERRO]', err.message);
    return null;
  }
}

// INÍCIO DO BOT
async function iniciarBot() {
  try {
    console.log('[BOT] Iniciando Aviator Monitor Betway...');

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

    console.log('[BOT] Abrindo URL...');
    await page.goto(URL_AVIATOR, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await enviarScreenshot('📸 Página inicial carregada');

    // LOGIN COM RETRY - SELETORES ATUALIZADOS
    console.log('[LOGIN] Iniciando...');
    let tentativas = 0;
    const maxTentativas = 2;

    while (tentativas < maxTentativas) {
      try {
        // Telefone: #header-username
        await page.waitForSelector('input#header-username', { timeout: 180000, visible: true });
        await page.type('input#header-username', TELEFONE);
        console.log('[LOGIN] Telefone digitado');

        // Senha: #header-password
        await page.waitForSelector('input#header-password', { timeout: 120000, visible: true });
        await page.type('input#header-password', SENHA);
        console.log('[LOGIN] Senha digitada');

        // Botão Entrar: #login-btn
        await page.waitForSelector('button#login-btn', { timeout: 120000, visible: true });
        await page.click('button#login-btn');
        console.log('[LOGIN] Botão Entrar clicado');

        // Espera jogo/iframe carregar
        await page.waitForSelector('iframe, div[class*="game"], div[id*="game"]', { timeout: 180000 });
        console.log('[LOGIN] Jogo carregando...');

        await new Promise(r => setTimeout(r, 15000));

        const frame = await getIframeFrame();
        if (!frame) throw new Error('Iframe não encontrado');

        enviarTelegram('🤖 Bot logado na Betway e monitorando histórico REAL! 🔥');
        break;
      } catch (e) {
        tentativas++;
        console.error(`[LOGIN] Tentativa ${tentativas} falhou:`, e.message);
        await enviarScreenshot(`❌ Falha login (tentativa ${tentativas})`);
        if (tentativas >= maxTentativas) throw e;
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    // LOOP PRINCIPAL - ARRAY ROLANTE
    setInterval(async () => {
      try {
        const frame = await getIframeFrame();
        if (!frame) return;

        const payouts = await frame.$$eval(
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
          }
        });

        if (atualizou) {
          fs.writeFileSync('historico.json', JSON.stringify(multiplicadores, null, 2));
          console.log(`[ARRAY] Atualizado → ${historicoAtual.length} itens`);
        }

      } catch (err) {
        console.error('[ERRO no loop]', err.message);
      }
    }, 8000);

  } catch (err) {
    console.error('[ERRO FATAL]', err.message);
    await enviarScreenshot('💥 ERRO FATAL');
    if (browser) await browser.close();
    process.exit(1);
  }
}

// ENDPOINTS
app.get('/health', (req, res) => res.status(200).send('✅ ONLINE'));

app.get('/historico', (req, res) => {
  res.json({ historicoAtual });
});

app.get('/', (req, res) => {
  res.send(`<h1>Betway Aviator Monitor</h1><p>Histórico atual: <code>${JSON.stringify(historicoAtual)}</code></p>`);
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  setTimeout(() => iniciarBot().catch(console.error), 10000);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Fechando...');
  if (browser) await browser.close();
  process.exit(0);
});
