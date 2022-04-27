import { container } from '@sapphire/framework';
import open from 'open';
import puppeteer from 'puppeteer';

import Account from '@/entities/Account';

import handleCsrfFetch from '../limiteds/handleCsrfFetch';

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

export default async function handleGameJoin(
  accountId: string,
  gameId: string,
  vipId: string
): Promise<void> {
  const account = await container.db.em.findOne(Account, { id: accountId });
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
  await page.exposeFunction('genOptions', genOptions);
  const xCSRFToken = await handleCsrfFetch(account);
  const authTicket = await page.evaluate(
    async input => {
      const AUTH_TICKET_URL = 'https://auth.roblox.com/v1/authentication-ticket';
      return fetch(AUTH_TICKET_URL, await genOptions(input.xCSRFToken)).then(
        async authTicketResponse => {
          return authTicketResponse.headers.get('RBX-Authentication-Ticket');
        }
      );
    },
    { xCSRFToken }
  );
  await browser.close();
  const time = Math.floor(Date.now() / 1000);
  open(
    `roblox-player:1+launchmode:play+gameinfo:${authTicket}+launchtime:${time}+placelauncherurl:https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestPrivateGame&placeId=${gameId}&linkCode=${vipId}+browsertrackerid:10000000000+robloxLocale:en_us+gameLocale:en_us+channel`
  );
}
