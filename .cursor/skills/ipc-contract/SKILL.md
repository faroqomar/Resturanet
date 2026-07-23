---
name: ipc-contract
description: Add or change a typed Resturanet renderer API without weakening Electron isolation.
---

# IPC contract

Use when `window.restaurantApi`, an IPC channel, or a privileged main-process
operation changes. Read `.cursor/reference/security-boundary.md` first.

## Design the capability

Define the smallest operation the renderer needs. Prefer a semantic method such
as `supplierPayments.save(input)` over generic database/file primitives. Inputs
and outputs must be structured-clone-safe DTOs.

## Implement in order

1. Update `RestaurantApi` and shared input/output types.
2. Add or reuse a strict Zod schema with bounded strings/arrays and validated
   IDs, dates, money, enums, and confirmation flags.
3. Add schema acceptance and malformed/oversized input tests.
4. Implement the main store/service transaction without renderer concepts.
5. Register one named handler; verify the event sender before parsing/calling.
6. Expose one narrow preload method that invokes only that fixed channel.
7. Use the typed method in renderer code.
8. Localize success, error, and explicit confirmation display.

## Verify

- valid values serialize across the bridge;
- unknown keys/malformed IDs/fractional money/invalid dates are rejected;
- cancellation differs from failure;
- errors reveal no stack, SQL, or unintended path;
- renderer imports no Electron/Node module;
- edit/trash/restore and restart behave consistently when persistent.

Reject raw `ipcRenderer`, arbitrary channel/table/SQL/path arguments, generic
filesystem access, functions/classes in DTOs, and disabled Electron isolation.
