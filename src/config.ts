export enum EmbedColors {
  Main = 0xadd8e6,
  Error = 0xed4245,
  Success = 0x4aff83,
  Loading = 0xffe65b,
}

export enum TradeParties {
  Sender = "SENDER",
  Receiver = "RECEIVER",
}

export enum TradeMediums {
  Bitcoin = "Bitcoin",
  Ethereum = "Ethereum",
  Litecoin = "Litecoin",
}

export const SimplifiedTradeMediums = {
  [TradeMediums.Bitcoin]: "BTC",
  [TradeMediums.Ethereum]: "ETH",
  [TradeMediums.Litecoin]: "LTC",
};

export const CryptoConfirmations = {
  [TradeMediums.Bitcoin]: 1,
  [TradeMediums.Ethereum]: 12,
  [TradeMediums.Litecoin]: 2,
};

export enum Interactions {
  TicketParticipantUserSelectMenu = "TicketParticipantUserSelectMenu",
  PromptQuestionConfirmButton = "PromptQuestionConfirmButton",
  PromptQuestionDenyButton = "PromptQuestionDenyButton",
  PartyIdentificationSendingButton = "PartyIdentificationSendingButton",
  PartyIdentificationReceivingButton = "PartyIdentificationReceivingButton",
  PartyIdentificationResetButton = "PartyIdentificationResetButton",
}

export const ChannelInactivityThreshold = 300_000;
export const ChannelStaleThreshold = 120_000;
