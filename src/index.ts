import "@sapphire/plugin-scheduled-tasks/register";
import * as dotenv from "dotenv";
import path from "path";

import { BotClient } from "@/src/client";

const client = new BotClient();

if (process.env.NODE_ENV !== "production") dotenv.config({ path: path.resolve(".env") });

if (process.env.BOT_TOKEN) client.login(process.env.BOT_TOKEN);

process.on("SIGTERM", () => process.exit());
