const { defineConfig } = require('@mikro-orm/core');

module.exports = defineConfig({
  type: 'postgresql',
  entities: ['./build/entities'],
  entitiesTs: ['./src/entities'],
  allowGlobalContext: true,
});
