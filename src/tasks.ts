import { Payload } from "@/types";

const printTask = async (taskId: string, payload: Payload): Promise<void> => {
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

const jsonRequestTask = async (taskId: string, payload: Payload): Promise<void> => {
    let { url, body=undefined, method='GET'} = payload;
    if (typeof url==="string") {
        const headers = { "Content-Type": "application/json" };
        if (body) {
            body = JSON.stringify(body);
        }
        console.info(`[${taskId}] ${method}: ${url}`);
        const response = await fetch(url, { method, headers, body });
        const statusCode = response.status.toString();
        if (!response.ok) {
            throw new Error(`[${taskId}]: response status: ${statusCode}`); 
        }
        const jsonResponse = await response.json();
        console.info(`[${taskId}]: ${statusCode} ${JSON.stringify(jsonResponse)}`);
    } else {
        throw new Error(`[${taskId}]: - missing url`);
    }
} 

export { printTask, jsonRequestTask };
