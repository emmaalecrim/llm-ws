import { FirebaseFunctionsRateLimiter } from "firebase-functions-rate-limiter";
import { firestore } from "./firebase";
import { encode } from "gpt-3-encoder";

export const chatLimiter = FirebaseFunctionsRateLimiter.withFirestoreBackend(
  {
    name: "chat-rate-limiter",
    maxCalls: 3000,
    periodSeconds: 60,
  },
  firestore
);

// @ts-expect-error - No anottation required
const chatRLIncORBackoff = async (exp = 0, limiter = chatLimiter, base = 2) => {
  try {
    await limiter.rejectOnQuotaExceededOrRecordUsage(); // will throw HttpsException with proper warning
  } catch (e) {
    console.debug(
      `Open AIs chat limit reached. Waiting ${base ** exp
      } s before trying to send request.`,
      JSON.stringify(e)
    );
    await delay(base ** exp * 1000);
    // Check again recursevely
    return chatRLIncORBackoff(exp++);
  }
};

export function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * This functions return token count for the  user role
 * We have to pass array of message object i.e: (messages = [{role:"user":"content":"Any prompt"}])
 */

export function countTokens(messages: object[]) {
  let tokenCount = 0;

  for (const message of messages) {
    // @ts-expect-error - We know that message has a content property
    const content = message.content;

    // Count tokens after encoding the message content
    const tokens = encode(content);
    tokenCount += tokens.length;
  }

  return tokenCount;
}

export default chatRLIncORBackoff;
