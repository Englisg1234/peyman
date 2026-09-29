import { configureGlobal } from "fast-check";

// Every property runs at least 100 times (Req 20.1).
configureGlobal({ numRuns: 100 });
