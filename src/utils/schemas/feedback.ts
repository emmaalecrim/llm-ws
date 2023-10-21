import { OperationType } from "./completion";

export type Feedback = {
    // Calls is a sequence of specific actions/requests made by the user.
    // for example, if the user sends feedback after using the reply flow(suggest then reply)
    // calls would have 2 items, one for suggest and one for reply with request body as input and response body as output
    calls: Call[]; // Record of what the user did and what the server responded with(so we can debug missing args or bad prompts)
    comment?: string; // User's comment,
    uid: string; // User's uid
    resource?: string; // uuid5 hash of the comment
};

export type Call = {
    type: OperationType;
    request: any;
    response: any;
};