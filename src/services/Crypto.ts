import { sign, utils } from "@noble/secp256k1";
import type { Address } from "@prisma/client";
import { AxiosError } from "axios";
import type { TextChannel } from "discord.js";
import { Effect } from "effect";

import { SimplifiedTradeMediums, TradeMediums } from "@/src/config";
import { AddressGenerationError } from "@/src/errors/AddressGenerationError";
import { BlockCypherApiError } from "@/src/errors/BlockCypherApiError";
import { CoinMarketCapApiError } from "@/src/errors/CoinMarketCapApiError";
import { GenericError } from "@/src/errors/GenericError";
import { resolveNetwork } from "@/src/helpers/crypto/resolveNetwork";
import { AxiosService } from "@/src/services/Axios";
import type { PrismaService } from "@/src/services/Prisma";

interface CoinMarketCapError {
  status: {
    timestamp: string;
    error_code: number;
    error_message: string;
    elapsed: number;
    credit_count: number;
  };
}

interface CoinMarketPriceConversionResponse extends CoinMarketCapError {
  data: [
    {
      symbol: string;
      id: string;
      name: string;
      amount: 50;
      last_updated: string;
      quote: {
        [key: string]: {
          price: number;
          last_updated: string;
        };
      };
    },
  ];
}

interface BlockCypherNewAddressResponse {
  private: string;
  public: string;
  address: string;
  wif: string;
}

interface BlockCypherTxSkeletonResponse {
  tx: {
    block_height: number;
    block_index: number;
    hash: string;
    addresses: string[];
    total: number;
    fees: number;
    size: number;
  };
  tosign: string[];
  errors: { [key: string]: string }[];
  signatures: string[];
  pubkeys: string[];
}

export interface BlockCypherHashInfoResponse {
  block_hash: string;
  block_height: number;
  block_index: number;
  hash: string;
  addresses: string[];
  total: number;
  fees: number;
  size: number;
  relayed_by: string;
  confirmed: string;
  received: string;
  ver: number;
  double_spend: boolean;
  vin_sz: number;
  vout_sz: number;
  confirmations: number;
  confidence: number;
  inputs: { sequence: number; addresses: string[] }[];
  outputs: { value: number; script: string; addresses: string[] }[];
}

export interface BlockCypherFullAddressInfoResponse {
  txs: BlockCypherHashInfoResponse[];
}

export interface BlockCypherFaucetResponse {
  tx_ref: string;
}

export class CryptoService {
  private readonly prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private coinmarketcap = AxiosService.newInstance({
    baseURL: "https://pro-api.coinmarketcap.com/v2",
    headers: { "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY },
  });

  private createBlockCypherInstance(coin: TradeMediums) {
    return AxiosService.newInstance({
      baseURL: `https://api.blockcypher.com/v1/${resolveNetwork(coin)}`,
      params: { token: process.env.BLOCKCYPHER_TOKEN },
    });
  }

  private callPriceConversionApi(params: Record<string, string>) {
    return Effect.tryPromise({
      try: () => this.coinmarketcap.get<CoinMarketPriceConversionResponse>("/tools/price-conversion", { params }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          const error = unknown as AxiosError<CoinMarketCapError>;
          return new CoinMarketCapApiError(error.response?.data.status.error_message);
        } else {
          return new CoinMarketCapApiError(unknown);
        }
      },
    });
  }

  public calculateCryptoValue(usdAmount: number, medium: TradeMediums) {
    return this.callPriceConversionApi({
      amount: usdAmount.toString(),
      symbol: "USD",
      convert: SimplifiedTradeMediums[medium] as string,
    });
  }

  public calculateFiatValue(cryptoAmount: string, medium: TradeMediums) {
    return this.callPriceConversionApi({
      amount: cryptoAmount,
      symbol: SimplifiedTradeMediums[medium] as string,
      convert: "USD",
    });
  }

  public newBotAddress(channel: TextChannel, medium: TradeMediums) {
    return Effect.tryPromise({
      try: () =>
        this.createBlockCypherInstance(medium).post<BlockCypherNewAddressResponse>(
          "/addrs",
          {},
          { params: { bech32: medium === TradeMediums.Bitcoin } }
        ),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          return new AddressGenerationError(unknown.message);
        } else {
          return new AddressGenerationError(unknown);
        }
      },
    }).pipe(
      Effect.flatMap((response) =>
        this.prisma.createAddress({
          id: channel.id,
          data: response.data.address,
          private: response.data.private,
          public: response.data.public,
          recovery: medium !== TradeMediums.Ethereum ? response.data.wif : response.data.private,
        })
      )
    );
  }

  public releaseHeldCrypto(medium: TradeMediums, source: Address, destination: string) {
    return Effect.tryPromise({
      try: () =>
        this.createBlockCypherInstance(medium).post<BlockCypherTxSkeletonResponse>("/txs/new", {
          inputs: [{ addresses: [source.data] }],
          outputs: [{ addresses: [destination], value: -1 }],
        }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          return new BlockCypherApiError(unknown.response?.data.error ?? unknown.message);
        } else {
          return new BlockCypherApiError(unknown);
        }
      },
    }).pipe(
      Effect.flatMap((response) =>
        Effect.forEach(response.data.tosign, (tosign) => {
          return Effect.tryPromise({
            try: async () => {
              const signature = utils.bytesToHex(await sign(tosign, source.private));
              return {
                txs: response.data,
                signature: medium === TradeMediums.Bitcoin ? `${signature}01` : signature,
              };
            },
            catch: (unknown) => {
              // container.sentry.captureException(unknown);
              return new GenericError(unknown);
            },
          });
        })
      ),
      Effect.flatMap((signatures) => {
        return Effect.tryPromise({
          try: () =>
            this.createBlockCypherInstance(medium).post<BlockCypherTxSkeletonResponse>("/txs/send", {
              ...signatures[0].txs,
              ...(medium !== TradeMediums.Ethereum ? { pubkeys: signatures.map(() => source.public) } : {}),
              signatures: signatures.map((signature) => signature.signature),
            }),
          catch: (unknown) => {
            // container.sentry.captureException(unknown);
            if (unknown instanceof AxiosError) {
              return new BlockCypherApiError(unknown.response?.data.error ?? unknown.message);
            } else {
              return new BlockCypherApiError(unknown);
            }
          },
        });
      }),
      Effect.tap(() => this.prisma.updateAddress(source, { released: true })),
      Effect.flatMap((response) => Effect.succeed(response.data.tx.hash))
    );
  }

  public getHashInfo(medium: TradeMediums, hash: string) {
    return Effect.tryPromise({
      try: () =>
        this.createBlockCypherInstance(medium).get<BlockCypherHashInfoResponse>(`/txs/${hash}`, {
          params: { limit: "999" },
        }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          return new BlockCypherApiError(unknown.response?.data.error ?? unknown.message);
        } else {
          return new BlockCypherApiError(unknown);
        }
      },
    });
  }

  public getAddressInfo(medium: TradeMediums, address: string) {
    return Effect.tryPromise({
      try: () => this.createBlockCypherInstance(medium).get<BlockCypherHashInfoResponse>(`/addrs/${address}`),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          return new BlockCypherApiError(unknown.response?.data.error ?? unknown.message);
        } else {
          return new BlockCypherApiError(unknown);
        }
      },
    });
  }

  public getFullAddressInfo(medium: TradeMediums, address: string) {
    return Effect.tryPromise({
      try: () =>
        this.createBlockCypherInstance(medium).get<BlockCypherFullAddressInfoResponse>(`/addrs/${address}/full`, {
          params: { limit: "50" },
        }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          return new BlockCypherApiError(unknown.response?.data.error ?? unknown.message);
        } else {
          return new BlockCypherApiError(unknown);
        }
      },
    });
  }

  public faucet(medium: TradeMediums, address: string, amount: string) {
    return Effect.tryPromise({
      try: () =>
        this.createBlockCypherInstance(medium).post<BlockCypherFaucetResponse>("/faucet", {
          address,
          amount: parseInt(amount),
        }),
      catch: (unknown) => {
        // container.sentry.captureException(unknown);
        if (unknown instanceof AxiosError) {
          return new BlockCypherApiError(unknown.response?.data.error ?? unknown.message);
        } else {
          return new BlockCypherApiError(unknown);
        }
      },
    });
  }
}
