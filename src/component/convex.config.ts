import { defineComponent } from "convex/server";
import crons from "@convex-dev/crons/convex.config.js";
import workpool from "@convex-dev/workpool/convex.config.js";

// Convex component definition for @waynesutton/agent-ready.
// Nested components: crons for dynamic scheduling, workpool for durable generation.
const component = defineComponent("agentReady");
component.use(crons);
component.use(workpool);

export default component;
