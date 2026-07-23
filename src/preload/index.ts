import { contextBridge, ipcRenderer } from "electron";
import type { RestaurantApi } from "../shared/contracts";

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args);

const api: RestaurantApi = {
  settings: {
    get: () => invoke("settings:get"),
    saveRestaurantName: (name) => invoke("settings:name", name),
    saveLanguage: (language) => invoke("settings:language", language),
    addCatalog: (kind, name) => invoke("settings:catalog:add", kind, name),
    toggleCatalog: (id, active) =>
      invoke("settings:catalog:toggle", id, active),
  },
  dashboard: { get: (range) => invoke("dashboard:get", range) },
  workDays: {
    list: (range) => invoke("work-days:list", range),
    get: (date) => invoke("work-days:get", date),
  },
  suppliers: {
    list: (includeInactive) => invoke("suppliers:list", includeInactive),
    get: (id) => invoke("suppliers:get", id),
    save: (input) => invoke("suppliers:save", input),
    trash: (id) => invoke("suppliers:trash", id),
  },
  restaurantExpenses: {
    list: (range) => invoke("restaurant-expenses:list", range),
    get: (id) => invoke("restaurant-expenses:get", id),
    save: (input) => invoke("restaurant-expenses:save", input),
    trash: (id) => invoke("restaurant-expenses:trash", id),
  },
  supplierInvoices: {
    list: (kind, range) => invoke("supplier-invoices:list", kind, range),
    get: (id) => invoke("supplier-invoices:get", id),
    save: (input) => invoke("supplier-invoices:save", input),
    trash: (id) => invoke("supplier-invoices:trash", id),
  },
  supplierPayments: {
    list: (range) => invoke("supplier-payments:list", range),
    get: (id) => invoke("supplier-payments:get", id),
    save: (input) => invoke("supplier-payments:save", input),
    trash: (id) => invoke("supplier-payments:trash", id),
  },
  supplierAdjustments: {
    list: (range) => invoke("supplier-adjustments:list", range),
    get: (id) => invoke("supplier-adjustments:get", id),
    save: (input) => invoke("supplier-adjustments:save", input),
    saveOpeningBalance: (input) =>
      invoke("supplier-adjustments:opening", input),
    trash: (id) => invoke("supplier-adjustments:trash", id),
  },
  sales: {
    list: (range) => invoke("sales:list", range),
    get: (id) => invoke("sales:get", id),
    save: (input) => invoke("sales:save", input),
    trash: (id) => invoke("sales:trash", id),
  },
  operatingExpenses: {
    list: (range) => invoke("operating-expenses:list", range),
    get: (id) => invoke("operating-expenses:get", id),
    save: (input) => invoke("operating-expenses:save", input),
    trash: (id) => invoke("operating-expenses:trash", id),
  },
  historicalEntries: {
    validateBatch: (entries) => invoke("historical:validate-batch", entries),
    saveBatch: (entries) => invoke("historical:save-batch", entries),
  },
  reports: {
    rows: (filters) => invoke("reports:rows", filters),
    exportCsv: (filters) => invoke("reports:csv", filters),
  },
  attachments: {
    pick: () => invoke("attachments:pick"),
    list: (entityType, entityId) =>
      invoke("attachments:list", entityType, entityId),
    open: (id) => invoke("attachments:open", id),
    discard: (token) => invoke("attachments:discard", token),
  },
  backup: {
    create: () => invoke("backup:create"),
    restore: () => invoke("backup:restore"),
  },
  trash: {
    list: () => invoke("trash:list"),
    restore: (type, id) => invoke("trash:restore", type, id),
    removePermanently: (type, id) => invoke("trash:remove", type, id),
  },
  print: { current: () => invoke("print:current") },
};

contextBridge.exposeInMainWorld("restaurantApi", api);
