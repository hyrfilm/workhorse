import { Payload } from "@/types";

const run = async (taskId: string, payload: Payload): Promise<void> => {
    let delay = 0;
    let msg = JSON.stringify(payload);
    if ("delay" in payload && typeof payload.delay==="number") {
        delay = payload.delay;
    }
    if ("msg" in payload && typeof payload.msg==="string") {
        msg = payload.msg;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    console.info(`[${taskId}]: ${msg}`);
}

export { run as printTask };
