import type { Consumable } from "./consumable.js";

export type MaybeConsumable<T> = T | Consumable<T>;

export * as MaybeConsumable from "./maybe-consumable/index.js";
