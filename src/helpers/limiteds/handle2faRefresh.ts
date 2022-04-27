import { container } from '@sapphire/framework';
import interval from 'interval-promise';
import { generateToken, verifyToken } from 'node-2fa';
import puppeteer from 'puppeteer';

import Account from '@/entities/Account';

import handleCsrfFetch from './handleCsrfFetch';

async function genTwoFactorCode(secret: string) {
  return new Promise(resolve => {
    interval(async (_, stop) => {
      const data = generateToken(secret);
      if (data && data.token) {
        const validity = verifyToken(secret, data.token);
        if (validity.delta === 0) {
          stop();
          resolve(data.token);
        }
      }
    }, 10000);
  });
}

function genOptions(xCSRFToken: string): any {
  return {
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json;charset=UTF-8',
      'x-csrf-token': xCSRFToken,
    },
    method: 'POST',
    credentials: 'include',
  };
}

export default async function handle2faRefresh(uid: string) {
  const account = await container.db.em.findOne(Account, { id: uid });
  const xCSRFToken = await handleCsrfFetch(account);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto('https://www.roblox.com/login');
  await page.setCookie({
    name: '.ROBLOSECURITY',
    value: account.cookie,
    domain: '.roblox.com',
    path: '/',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
    httpOnly: true,
    secure: true,
  });
  await page.reload();
  await page.waitForNetworkIdle();
  await page.exposeFunction('genOptions', genOptions);
  await page.exposeFunction('genTwoFactorCode', genTwoFactorCode);
  const status = await page.evaluate(
    async input => {
      return fetch(
        'https://trades.roblox.com/v1/trade-friction/two-step-verification/generate',
        await genOptions(input.xCSRFToken)
      )
        .then(async challenge => {
          const challengeId = await challenge.json();
          return fetch(
            `https://twostepverification.roblox.com/v1/users/${input.uid}/challenges/authenticator/verify`,
            {
              ...(await genOptions(input.xCSRFToken)),
              body: JSON.stringify({
                actionType: 'ItemTrade',
                challengeId,
                code: await genTwoFactorCode(input.secret),
              }),
            }
          )
            .then(async verificationResponse => {
              const verificationData = await verificationResponse.json();
              return fetch(
                'https://trades.roblox.com/v1/trade-friction/two-step-verification/redeem',
                {
                  ...(await genOptions(input.xCSRFToken)),
                  body: JSON.stringify({
                    challengeToken: challengeId,
                    verificationToken: verificationData.verificationToken,
                  }),
                }
              )
                .then(async redemption => {
                  const redeemed: boolean = await redemption.json();
                  return redeemed;
                })
                .catch(() => false);
            })
            .catch(() => false);
        })
        .catch(() => false);
    },
    { xCSRFToken, uid, secret: account.secret }
  );
  await page.close();
  await browser.close();
  return status;
}
