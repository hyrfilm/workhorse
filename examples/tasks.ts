import { assertNonPrimitive, Payload } from "../src/types";

const printTask = async (taskId: string, payload: Payload): Promise<undefined> => {
    assertNonPrimitive(payload);

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

const jsonRequestTask = async (taskId: string, payload: Payload): Promise<Payload | undefined> => {
    assertNonPrimitive(payload);

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
    return await response.json();
}

const appendHTMLTask = async (taskId: string, payload: Payload): Promise<undefined> => {
    assertNonPrimitive(payload);
    console.log("Executing task: ", taskId);

    const { parentId, tag, text } = payload;
    let { delay } = payload;
    if (typeof delay!=="number") {
        delay = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (typeof parentId==="string" && typeof tag==="string" && typeof text==="string") {
        const parent = document.getElementById(parentId) as Element;
        const el = document.createElement(tag);
        el.id = taskId;
        el.textContent = text;
        parent.appendChild(el);
    }
}

export { printTask, appendHTMLTask, jsonRequestTask };
