module.exports = {
  apps: [
    {
      name: 'automation-bot',
      script: 'build/index.js',
      env: {
        BOT_TOKEN: 'xxxx',
        LUCKY_ROLE_ID: 'xxxx',
        CLIENT_ROLE_ID: 'xxxx',
        TOP_CLIENT_ROLE_ID: 'xxxx',
        RICH_CLIENT_ROLE_ID: 'xxxx',
        PREMIER_CLIENT_ROLE_ID: 'xxxx',
        VOUCH_CHANNEL_ID: 'xxxx',
        LUCKY_CHANNEL_ID: 'xxxx',
        NODE_ENV: 'production',
        CMC_API_KEY: 'xxxx',
        BLOCKCYPHER_TOKEN: 'xxxx',
        MIKRO_ORM_PASSWORD: 'xxxx',
        PROXY_PASSWORD: 'xxxx',
        SENTRY_DSN: 'xxxx',
      },
    },
  ],
};
