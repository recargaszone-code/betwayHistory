// ========================================================
// Aviator Monitor Bot - PremierBet 24/7 (ULTRA HUMANIZADO + FECHA MODAL)
// Fecha popup de promoções/subscription + mostra tela pós-login
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

// ── HUMANIZAÇÃO ──
async function humanDelay(min = 8000, max = 13000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`[HUMAN] Esperando ${Math.floor(delay/1000)}s...`);
  await new Promise(r => setTimeout(r, delay));
}

async function randomMouseMove() {
  try {
    const x = 100 + Math.random() * 900;
    const y = 100 + Math.random() * 500;
    await page.mouse.move(x, y, { steps: 20 + Math.random()*10 });
  } catch(e) {}
}

async function humanType(selector, text) {
  await page.waitForSelector(selector, { visible: true, timeout: 30000 });
  await randomMouseMove();
  await page.click(selector);
  await page.type(selector, text, { delay: 60 + Math.random() * 140 });
  console.log(`[HUMAN] Digitado: ${text}`);
}

async function humanClick(selector) {
  await page.waitForSelector(selector, { visible: true, timeout: 30000 });
  await randomMouseMove();
  const el = await page.$(selector);
  const box = await el.boundingBox();
  const clickX = box.x + box.width / 2 + (Math.random() * 20 - 10);
  const clickY = box.y + box.height / 2 + (Math.random() * 20 - 10);
  await page.mouse.move(clickX, clickY, { steps: 25 });
  await page.mouse.down();
  await humanDelay(100, 300);
  await page.mouse.up();
  console.log(`[HUMAN] Clique humano em ${selector}`);
}

// ── PRINT + ENVIO ──
async function tirarPrint(nome) {
  try {
    const caminho = `/tmp/${nome.replace(/\s/g, '-')}.png`;
    await page.screenshot({ path: caminho, fullPage: true });
    await bot.sendPhoto(CHAT_ID, fs.createReadStream(caminho), {
      caption: `📸 ${nome} - ${new Date().toLocaleTimeString('pt-BR')}`
    });
    fs.unlinkSync(caminho);
    console.log(`[PRINT] Enviado: ${nome}`);
  } catch (e) {
    console.error('[PRINT ERRO]', e.message);
  }
}

// ── FECHAR MODAL DE PROMOÇÃO ──
async function fecharModalPromocao() {
  try {
    console.log('[MODAL] Procurando popup de promoções...');
    await humanDelay(3000, 6000);

    // Tenta clicar em "MAIS TARDE" (texto exato do botão que tu mandou print)
    const botaoMaisTarde = await page.evaluateHandle(() => {
      const buttons = document.querySelectorAll('button, div[role="button"], span');
      for (let btn of buttons) {
        const text = btn.innerText.toLowerCase().trim();
        if (text.includes('mais tarde') || text.includes('mais tarde') || text === 'mais tarde') {
          return btn;
        }
      }
      return null;
    });

    if (botaoMaisTarde.asElement()) {
      console.log('[MODAL] Encontrou "MAIS TARDE"! Fechando...');
      await humanClick('text/mais tarde'); // fallback selector por texto
      await humanDelay(4000, 8000);
      await tirarPrint('Modal Fechado - Mais Tarde Clicado');
      return true;
    } else {
      console.log('[MODAL] Não encontrou botão "MAIS TARDE". Tentando overlay genérico...');
      // Tenta clicar fora do modal (overlay)
      await page.mouse.click(100, 100); // canto superior esquerdo
      await humanDelay(3000, 6000);
      await tirarPrint('Modal Tentativa Fechada - Clique Fora');
      return true;
    }
  } catch (err) {
    console.log('[MODAL] Erro ao fechar:', err.message);
    return false;
  }
}

// ── BOT PRINCIPAL ──
async function iniciarBot() {
  try {
    console.log('[BOT] Iniciando com humanização + anti-modal...');

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1366,768',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
      ],
      ignoreHTTPSErrors: true
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    console.log(`[BOT] Abrindo URL...`);
    await page.goto(URL_AVIATOR, { waitUntil: 'networkidle2', timeout: 90000 });
    await humanDelay(8000, 14000);
    await tirarPrint('1 - Site Carregado (pode ter modal)');

    // ── FECHA O MODAL ANTES DO LOGIN ──
    await fecharModalPromocao();

    // ── LOGIN ──
    console.log('[LOGIN] Iniciando...');
    await humanDelay(6000, 10000);

    await humanType('input[name="login"]', TELEFONE);
    await tirarPrint('2 - Telefone Digitado');

    await humanDelay(7000, 12000);
    await humanType('input[name="password"]', SENHA);
    await tirarPrint('3 - Senha Digitada');

    await humanDelay(6000, 11000);
    await humanClick('button.form-button.form-button--primary');
    await tirarPrint('4 - Botão Login Clicado');

    // Espera pós-login + tenta fechar modal de novo se reaparecer
    await humanDelay(15000, 25000);
    await fecharModalPromocao(); // tenta fechar de novo pós-login
    await page.waitForSelector('iframe', { timeout: 120000 }).catch(() => {});
    await humanDelay(10000, 18000);

    await tirarPrint('5 - Pós-Login (iframe deve estar visível agora)');

    const frame = await page.waitForSelector('iframe', { timeout: 30000 })
      .then(el => el.contentFrame())
      .catch(() => null);

    if (!frame) {
      console.log('[ERRO] Iframe do Aviator não apareceu');
      await tirarPrint('ERRO - Sem Iframe Após Login');
      throw new Error('Iframe não carregou');
    }

    await tirarPrint('6 - Tela do Aviator Visível (pós-login sucesso)');

    enviarTelegram('🤖 Bot logado na PremierBet! 🔥\nModal de promoções fechado.\nAgora monitorando histórico real do Aviator.\n📸 Prints de todos os passos enviados!');

    // LOOP MONITORAMENTO
    setInterval(async () => {
      try {
        const frameAtual = await page.$('iframe').then(el => el?.contentFrame());
        if (!frameAtual) return;

        const payouts = await frameAtual.$$eval(
          '.payouts-block .payout.ng-star-inserted',
          els => els.map(el => el.innerText.trim()).filter(t => t && t.endsWith('x'))
        );

        const novos = [];
        payouts.forEach(texto => {
          const valor = parseFloat(texto.replace('x','').trim().replace(',','.'));
          if (!isNaN(valor) && !historicoAntigo.has(valor.toFixed(2))) {
            historicoAntigo.add(valor.toFixed(2));
            const ts = new Date().toISOString().replace('T',' ').slice(0,19);
            multiplicadores.push({ timestamp: ts, valor });
            novos.push(valor);

            let msg = `🕒 ${ts} | <b>${valor.toFixed(2)}x</b>`;
            if (valor >= 50) msg = `🚀 FOGUETÃO INSANO! ${valor.toFixed(2)}x 🚀\n${msg}`;
            else if (valor >= 10) msg = `🔥 BOA! ${valor.toFixed(2)}x 🔥\n${msg}`;
            enviarTelegram(msg);
          }
        });

        if (novos.length > 0) {
          fs.writeFileSync('historico.json', JSON.stringify(multiplicadores, null, 2));
        }
      } catch (err) {
        console.error('[LOOP ERRO]', err.message);
      }
    }, 10000 + Math.random() * 5000); // loop variado 10-15s

  } catch (err) {
    console.error('[ERRO FATAL]', err.message);
    await tirarPrint('ERRO-FATAL');
    if (browser) await browser.close();
  }
}

// SERVER
app.get('/', (req, res) => {
  res.send(`<h1>Aviator PremierBet - Anti-Modal + Humanizado</h1><p>Status: Rodando</p><p>Capturados: ${multiplicadores.length}</p>`);
});

app.listen(port, () => {
  console.log(`Servidor na porta ${port}`);
  iniciarBot();
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
