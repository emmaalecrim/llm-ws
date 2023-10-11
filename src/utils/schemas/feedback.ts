export type Feedback = {
    // Calls is a sequence of specific actions/requests made by the user.
    // for example, if the user sends feedback after using the reply flow(suggest then reply)
    // calls would have 2 items, one for suggest and one for reply with request body as input and response body as output
    calls: Call[]; // Record of what the user did and what the server responded with(so we can debug missing args or bad prompts)
    comment: string; // User's comment
};

export type Call = {
    type: "improve" | "reply" | "suggest" | "classify"; // Whatever type is used in the op
    request: any;
    response?: string | string[] | object; // TODO: improve this type to also include metadata about request { version, model, etc }
};