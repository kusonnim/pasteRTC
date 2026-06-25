/**
 * Encodes an RTC offer for manual copy-paste signaling.
 *
 * @param {RTCSessionDescriptionInit} offer
 * @returns {string}
 */
export function encodeOffer(offer) {
  return encodeDescription(offer);
}

/**
 * Decodes and validates a copy-paste RTC offer.
 *
 * @param {string} offerText
 * @returns {RTCSessionDescriptionInit}
 */
export function decodeOffer(offerText) {
  return decodeDescription(offerText, "offer");
}

/**
 * Encodes an RTC answer for manual copy-paste signaling.
 *
 * @param {RTCSessionDescriptionInit} answer
 * @returns {string}
 */
export function encodeAnswer(answer) {
  return encodeDescription(answer);
}

/**
 * Decodes and validates a copy-paste RTC answer.
 *
 * @param {string} answerText
 * @returns {RTCSessionDescriptionInit}
 */
export function decodeAnswer(answerText) {
  return decodeDescription(answerText, "answer");
}

function encodeDescription(description) {
  return JSON.stringify(description);
}

function decodeDescription(text, expectedType) {
  if (!text.trim()) {
    throw new Error(`Paste a ${expectedType} first.`);
  }

  let description;

  try {
    description = JSON.parse(text);
  } catch {
    throw new Error(`The ${expectedType} is not valid JSON.`);
  }

  if (description.type !== expectedType || typeof description.sdp !== "string") {
    throw new Error(`The pasted signal is not a valid ${expectedType}.`);
  }

  return description;
}
