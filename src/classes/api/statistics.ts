import { container } from "@sapphire/pieces";
import type { AxiosRequestConfig } from "axios";
import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
import type { TextChannel } from "discord.js";
import { Console, Effect } from "effect";
import { toLower } from "lodash";

import type { TradeMediums } from "@/src/config";
import { SimplifiedTradeMediums } from "@/src/config";
import { LogSnagApiError } from "@/src/errors/LogSnagApiError";
import type { CryptoDealAmount } from "@/src/handlers/crypto/handleAmountSelection";

export class StatisticsApi {
  private createBaseInstance(options?: AxiosRequestConfig) {
    const instance = axios.create(options);
    axiosRetry(instance, {
      retries: 5,
      retryDelay(retryCount, error) {
        const delay = axiosRetry.exponentialDelay(retryCount);
        const handShakeFailedDelay = delay + 10000;
        return (error.response?.status ?? 0) === 565 ? handShakeFailedDelay : delay;
      },
      retryCondition(error) {
        return (error.response?.status ?? 0) === 565 ? true : axiosRetry.isNetworkOrIdempotentRequestError(error);
      },
    });
    return instance;
  }

  private logsnag = this.createBaseInstance({
    baseURL: "https://api.logsnag.com/v1",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LOGSNAG_API_KEY}`,
    },
  });

  private callLogSnagApi(body: Record<string, unknown>) {
    if (container.environment === "development") return Console.log(body);
    return Effect.tryPromise({
      try: () => this.logsnag.post("/log", body),
      catch: (unknown) => {
        container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          const error = unknown as AxiosError;
          return new LogSnagApiError(error.response?.data);
        } else {
          return new LogSnagApiError(unknown);
        }
      },
    });
  }

  public trackTicketAction(
    channel: TextChannel,
    medium: TradeMediums,
    action: "create" | "invite" | "role-selection" | "amount-selection"
  ) {
    const eventName =
      action === "create"
        ? "Ticket Created"
        : action === "invite"
        ? "Participant Invited to Ticket"
        : action === "role-selection"
        ? "Exchange Roles Selected"
        : "Exchange Amount Selected";
    return this.callLogSnagApi({
      project: "escrow",
      channel: "tickets",
      event: eventName,
      user_id: channel.id,
      icon: "🎟️",
      tags: { medium: toLower(SimplifiedTradeMediums[medium]) },
    });
  }

  public trackCrypto(channel: TextChannel, medium: TradeMediums, amount: CryptoDealAmount) {
    return this.callLogSnagApi({
      project: "escrow",
      channel: "crypto",
      event: "Crypto Held",
      description: `Held ${amount.crypto} ${SimplifiedTradeMediums[medium]} (${amount.fiat})`,
      user_id: channel.id,
      icon: "💰",
      tags: {
        medium: toLower(SimplifiedTradeMediums[medium]),
        fiat: amount.fiat,
        crypto: amount.crypto,
      },
    });
  }
}
