import type { Handler, HandlerContext, HandlerEvent } from "@netlify/functions";
import crypto from "crypto";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {

    const authorized = gitHubSha256Middleware(event);
    if (!authorized) { throw new Error("Not authorized")}
    
    const gitHubEvent = event.headers['x-github-event'] ?? 'unknown';
    const payload = JSON.parse(event.body ?? '{}');
    let message = '';
    switch (gitHubEvent) {
        case 'star':
            message = onStart(payload);
            break;
        case 'issues':
            message = onIssue(payload);
            break;
        default:
            message = `Unknow event: ${gitHubEvent}`;
    }

    try{
        await notify(message);
    }
    catch(err) {
        console.log(err);
    }
    return {
        statusCode: 202,
        body: JSON.stringify({
            message: 'done',
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }
    
}

const onStart = (payload: any): string =>{
    let message: string = '';
    const { action, repository, starred_at, sender } = payload;

    message = `User ${sender.login} ${action} star on ${repository.full_name} at ${starred_at}`;

    return message;
}

const onIssue = (payload: any): string =>{
    let message = '';
    const { issue, action } = payload;

    if (action === 'opened') {
        message = `An issue was oppened with this title ${issue.title}`;
    }
    else if (action === 'closed') {
        message = `An issue was closed by ${issue.user.login}`;
    }
    else if (action === 'reopened') {
        message = `An issue was reopened by ${issue.user.login}`;
    }
    else {
        message = `Unhandled action for issue event ${action}`;
    }

    return message;
}



const notify = async(message: string) => {
    const body = {
        content: message,
    }
    
    const response = await fetch(process.env.DISCORD_WEBHOOK_URL ?? '' , {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.log('Error sending message to discord');
        return false;
    }
    return true;
}

const verify_signature = (event: HandlerEvent) => {
    try {

        const signature = crypto
            .createHmac("sha256", process.env.SECRET_TOKEN ?? '')
            .update(event.body ?? '')
            .digest("hex");
        const xHubSignature = event.headers["x-hub-signature-256"] ?? '';
        let trusted = Buffer.from(`sha256=${signature}`, 'ascii');
        let untrusted = Buffer.from(xHubSignature, 'ascii');
        return crypto.timingSafeEqual(trusted, untrusted);
    }
    catch (error) {
        console.log(error);
        return false;
    }
};

const gitHubSha256Middleware = (event: HandlerEvent) => {
    if (!verify_signature(event)) {
        return false;
    }
    return true;
}

export { handler };

