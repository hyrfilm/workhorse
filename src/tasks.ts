import { Payload } from "@/types";

const printTask = async (taskId: string, payload: Payload): Promise<void> => {
    let delay = 0;
    let msg = '';
    if (typeof payload.delay==="number") {
        delay = payload.delay;
    }
    if (typeof payload.msg==="string") {
        msg = payload.msg;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    console.info(`[${taskId}]: ${msg}`);
}

const jsonRequestTask = async (taskId: string, payload: Payload): Promise<void> => {
    let { url, body, method } = payload;
    if (typeof url!=="string") {
        url = '';
    }
    if (body!=null) {
        body = JSON.stringify(body);
    }
    if (typeof method!=="string") {
        method = "GET";
    }

    const headers = { "Content-Type": "application/json" };
    console.info(`[${taskId}] ${method}: ${url}`);
    const response = await fetch(url, { method, headers, body });
    const statusCode = response.status.toString();
    if (!response.ok) {
        throw new Error(`[${taskId}]: response status: ${statusCode}`); 
    }
    const jsonResponse = await response.json();
    console.info(`[${taskId}]: ${statusCode} ${JSON.stringify(jsonResponse)}`);
} 

export { printTask, jsonRequestTask };
